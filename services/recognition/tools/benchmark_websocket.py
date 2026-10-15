"""Local I-08 comparison: real JPEG/WebSocket pipeline, synthetic blank input.

Run from services/recognition, using the service's Python environment:
  python tools/benchmark_websocket.py --out <ignored-local-report.json>
No camera, SSL content, accuracy evaluation, network TTS or dataset is used.
The temporary localhost server disables lifespan/TTS warm-up. Backend changes
are confined to this benchmark process; the shipped engine is not rewritten.
"""

import argparse
import asyncio
import base64
import hashlib
import json
import platform
import sys
import threading
import time
from pathlib import Path
from urllib.request import urlopen

import cv2
import numpy as np
import uvicorn
import websockets

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


async def measure(service, port, windows):
    engine = service.fast_engine
    if not getattr(engine, "compiled_fn", None):
        raise RuntimeError("tf.function backend unavailable: cannot compare both backends")
    compiled, interpreter, backend = engine.compiled_fn, engine.interpreter, engine.backend
    ok, jpeg = cv2.imencode(".jpg", np.zeros((224, 224, 3), dtype=np.uint8))
    assert ok
    message = "data:image/jpeg;base64," + base64.b64encode(jpeg).decode("ascii")
    results = {}
    try:
        for candidate in ("tf_function", "keras_predict"):
            engine.backend = candidate
            engine.interpreter = None
            engine.compiled_fn = compiled if candidate == "tf_function" else None
            runs, confidences = [], []
            async with websockets.connect(f"ws://127.0.0.1:{port}/ws/recognize") as ws:
                # Fill the 30-frame sliding window, then warm five predictions.
                for index in range(service.config["video"]["frames_per_sequence"] - 1 + 5 + windows):
                    start = time.perf_counter()
                    await ws.send(message)
                    payload = json.loads(await ws.recv())
                    elapsed = (time.perf_counter() - start) * 1000
                    assert payload["type"] == "frame_result", payload
                    if index >= service.config["video"]["frames_per_sequence"] - 1 + 5:
                        assert payload["bufferProgress"] == 1
                        runs.append(elapsed)
                        confidences.append(payload["confidence"])
            results[candidate] = {"windows": len(runs), "median_ms": float(np.median(runs)),
                                  "p90_ms": float(np.percentile(runs, 90)), "samples_ms": runs,
                                  "confidences": confidences}
        # Same input and output contract: compare rounded wire probabilities.
        assert results["tf_function"]["confidences"] == results["keras_predict"]["confidences"]
        return results
    finally:
        engine.compiled_fn, engine.interpreter, engine.backend = compiled, interpreter, backend


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--port", type=int, default=8015)
    parser.add_argument("--windows", type=int, default=50)
    args = parser.parse_args()
    if args.windows < 50:
        parser.error("I-08 requires at least 50 full inference windows per backend")
    from webapp import server as service

    server = uvicorn.Server(uvicorn.Config(service.app, host="127.0.0.1", port=args.port,
                                           lifespan="off", log_level="error"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    deadline = time.monotonic() + 30
    while not server.started:
        if not thread.is_alive() or time.monotonic() > deadline:
            raise RuntimeError("Benchmark localhost server did not start")
        time.sleep(0.05)
    try:
        with urlopen(f"http://127.0.0.1:{args.port}/api/info", timeout=5) as response:
            info = json.load(response)
        assert info["numClasses"] == len(info["labels"]) == 171, info
        assert service.model.output_shape[-1] == info["numClasses"]
        assert info["sequenceLength"] == service.config["video"]["frames_per_sequence"]
        assert info["confidenceThreshold"] == service.config["recognition"]["confidence_threshold"]
        results = asyncio.run(measure(service, args.port, args.windows))
        report = {"input": "synthetic blank 224x224 JPEG; actual decode, MediaPipe, model and WebSocket",
                  "scope": "localhost CPU round-trip; no signer, accuracy or hosted-device claim",
                  "platform": platform.platform(), "python": sys.version.split()[0],
                  "tensorflow": service.tf.__version__, "api_info": info,
                  "model_sha256": hashlib.sha256((ROOT / service.config['model']['model_path']).read_bytes()).hexdigest(),
                  "labels_sha256": hashlib.sha256((ROOT / 'data/processed/labels.npy').read_bytes()).hexdigest(),
                  "results": results, "faster": min(results, key=lambda name: results[name]["median_ms"])}
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps({"faster": report["faster"], "results": {
            name: {key: value for key, value in result.items() if key not in ("samples_ms", "confidences")}
            for name, result in results.items()}}, indent=2))
    finally:
        server.should_exit = True
        thread.join(timeout=10)


if __name__ == "__main__":
    main()
