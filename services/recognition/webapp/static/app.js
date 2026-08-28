(() => {
  "use strict";

  // Full MediaPipe Holistic connection tables (extracted from
  // mediapipe.solutions.holistic.POSE_CONNECTIONS / FACEMESH_CONTOURS / HAND_CONNECTIONS)
  // so the web overlay matches the desktop app's tracking detail.
  const POSE_CONNECTIONS = [
    [0, 1], [0, 4], [1, 2], [2, 3], [3, 7], [4, 5], [5, 6], [6, 8], [9, 10],
    [11, 12], [11, 13], [11, 23], [12, 14], [12, 24], [13, 15], [14, 16],
    [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22], [17, 19],
    [18, 20], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28], [27, 29],
    [27, 31], [28, 30], [28, 32], [29, 31], [30, 32],
  ];
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17],
  ];
  const FACE_CONNECTIONS = [
    [0, 37], [0, 267], [7, 33], [7, 163], [10, 109], [10, 338], [13, 82], [13, 312],
    [14, 87], [14, 317], [17, 84], [17, 314], [21, 54], [21, 162], [33, 246], [37, 39],
    [39, 40], [40, 185], [46, 53], [52, 53], [52, 65], [54, 103], [55, 65], [58, 132],
    [58, 172], [61, 146], [61, 185], [63, 70], [63, 105], [66, 105], [66, 107], [67, 103],
    [67, 109], [78, 95], [78, 191], [80, 81], [80, 191], [81, 82], [84, 181], [87, 178],
    [88, 95], [88, 178], [91, 146], [91, 181], [93, 132], [93, 234], [127, 162], [127, 234],
    [133, 155], [133, 173], [136, 150], [136, 172], [144, 145], [144, 163], [145, 153],
    [148, 152], [148, 176], [149, 150], [149, 176], [152, 377], [153, 154], [154, 155],
    [157, 158], [157, 173], [158, 159], [159, 160], [160, 161], [161, 246], [249, 263],
    [249, 390], [251, 284], [251, 389], [263, 466], [267, 269], [269, 270], [270, 409],
    [276, 283], [282, 283], [282, 295], [284, 332], [285, 295], [288, 361], [288, 397],
    [291, 375], [291, 409], [293, 300], [293, 334], [296, 334], [296, 336], [297, 332],
    [297, 338], [308, 324], [308, 415], [310, 311], [310, 415], [311, 312], [314, 405],
    [317, 402], [318, 324], [318, 402], [321, 375], [321, 405], [323, 361], [323, 454],
    [356, 389], [356, 454], [362, 382], [362, 398], [365, 379], [365, 397], [373, 374],
    [373, 390], [374, 380], [377, 400], [378, 379], [378, 400], [380, 381], [381, 382],
    [384, 385], [384, 398], [385, 386], [386, 387], [387, 388], [388, 466],
  ];

  const CAPTURE_WIDTH = 320;
  const CAPTURE_HEIGHT = 240;
  const JPEG_QUALITY = 0.62;

  // Server updates arrive at ~7Hz; interpolating toward each new target at
  // 60fps (instead of snapping the instant a message arrives) is what makes
  // tracking read as fluid/professional rather than a jittery webcam demo.
  const LERP_POSITION = 0.35;
  const LERP_ALPHA = 0.18;
  const LERP_CONFIDENCE = 0.12;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  class LandmarkGroup {
    constructor() {
      this.points = null;
      this.targetPoints = null;
      this.hasTarget = false;
      this.alpha = 0;
    }

    setTarget(points) {
      this.hasTarget = Array.isArray(points) && points.length > 0;
      this.targetPoints = this.hasTarget ? points : null;
      if (this.hasTarget && (!this.points || this.points.length !== points.length)) {
        this.points = points.map((p) => p.slice());
      }
    }

    step() {
      this.alpha = lerp(this.alpha, this.hasTarget ? 1 : 0, LERP_ALPHA);
      if (this.hasTarget && this.targetPoints && this.points) {
        for (let i = 0; i < this.points.length; i++) {
          this.points[i][0] = lerp(this.points[i][0], this.targetPoints[i][0], LERP_POSITION);
          this.points[i][1] = lerp(this.points[i][1], this.targetPoints[i][1], LERP_POSITION);
          this.points[i][2] = lerp(this.points[i][2] || 0, this.targetPoints[i][2] || 0, LERP_POSITION);
        }
      }
    }
  }

  const landmarkGroups = {
    face: new LandmarkGroup(),
    pose: new LandmarkGroup(),
    leftHand: new LandmarkGroup(),
    rightHand: new LandmarkGroup(),
  };

  let smoothedConfidence = 0;
  let targetConfidence = 0;
  let renderLoopActive = false;
  let skeletonVisible = true;
  let faceVisible = true;

  const video = document.getElementById("video");
  const videoWrap = document.getElementById("videoWrap");
  const overlay = document.getElementById("overlay");
  const overlayCtx = overlay.getContext("2d");
  const videoEmpty = document.getElementById("videoEmpty");
  const recBadge = document.getElementById("recBadge");

  const startBtn = document.getElementById("startBtn");
  const muteBtn = document.getElementById("muteBtn");
  const muteLabel = document.getElementById("muteLabel");
  const resetBtn = document.getElementById("resetBtn");

  const bufferFill = document.getElementById("bufferFill");
  const captionText = document.getElementById("captionText");
  const captionGloss = document.getElementById("captionGloss");
  const confidenceFill = document.getElementById("confidenceFill");
  const confidenceValue = document.getElementById("confidenceValue");

  const historyList = document.getElementById("historyList");
  const historyCount = document.getElementById("historyCount");

  const connectionStatus = document.getElementById("connectionStatus");
  const connectionDot = document.getElementById("connectionDot");
  const connectionLabel = document.getElementById("connectionLabel");

  const labelsList = document.getElementById("labelsList");
  const labelsCount = document.getElementById("labelsCount");
  const labelSearch = document.getElementById("labelSearch");

  const speechAudio = document.getElementById("speechAudio");
  const audioHint = document.getElementById("audioHint");

  const statCount = document.getElementById("statCount");
  const statAvgConfidence = document.getElementById("statAvgConfidence");
  const statFps = document.getElementById("statFps");
  const statLatency = document.getElementById("statLatency");
  const statDuration = document.getElementById("statDuration");

  const guideBtn = document.getElementById("guideBtn");
  const guideClose = document.getElementById("guideClose");
  const guideDrawer = document.getElementById("guideDrawer");
  const guideSeqLen = document.getElementById("guideSeqLen");

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsClose = document.getElementById("settingsClose");
  const settingsDrawer = document.getElementById("settingsDrawer");
  const settingsScrim = document.getElementById("settingsScrim");
  const toggleSkeleton = document.getElementById("toggleSkeleton");
  const toggleFace = document.getElementById("toggleFace");
  const infoSeqLen = document.getElementById("infoSeqLen");
  const infoThreshold = document.getElementById("infoThreshold");
  const infoClasses = document.getElementById("infoClasses");

  const captureCanvas = document.createElement("canvas");
  captureCanvas.width = CAPTURE_WIDTH;
  captureCanvas.height = CAPTURE_HEIGHT;
  const captureCtx = captureCanvas.getContext("2d", { willReadFrequently: true });

  let mediaStream = null;
  let ws = null;
  let running = false;
  let awaitingResponse = false;
  let captureTimer = null;
  let lastAnnouncedGesture = null;
  let muted = false;
  let allLabels = [];

  let sessionStartTime = null;
  let durationTimer = null;
  let recognizedCount = 0;
  let confidenceSum = 0;
  const historyEntries = [];

  let frameSentTime = 0;
  let frameCount = 0;
  let lastFpsUpdate = performance.now();

  function setConnectionState(state, label) {
    connectionStatus.classList.remove("connected", "error");
    if (state) connectionStatus.classList.add(state);
    connectionLabel.textContent = label;
  }

  function resizeOverlay() {
    const rect = video.getBoundingClientRect();
    overlay.width = rect.width;
    overlay.height = rect.height;
  }
  window.addEventListener("resize", resizeOverlay);

  // z is roughly-normalized relative depth (more negative = closer to the
  // camera); tightly clamped so the effect is always a subtle "pop" rather
  // than a risk of ever looking broken across the different reference
  // frames pose/hand/face landmarks use for z.
  const depthScale = (z) => clamp(1 - z * 3, 0.75, 1.3);

  function drawConnections(points, connections, alpha, rgb, lineWidth, w, h) {
    if (!points || alpha <= 0.01) return;
    overlayCtx.strokeStyle = `rgba(${rgb},${alpha})`;
    overlayCtx.lineWidth = lineWidth;
    overlayCtx.lineCap = "round";
    overlayCtx.beginPath();
    connections.forEach(([a, b]) => {
      if (!points[a] || !points[b]) return;
      overlayCtx.moveTo(points[a][0] * w, points[a][1] * h);
      overlayCtx.lineTo(points[b][0] * w, points[b][1] * h);
    });
    overlayCtx.stroke();
  }

  function drawGlowingJoints(points, alpha, rgb, baseRadius, w, h) {
    if (!points || alpha <= 0.01) return;
    points.forEach((p) => {
      const r = baseRadius * depthScale(p[2] || 0);
      const cx = p[0] * w;
      const cy = p[1] * h;
      const gradient = overlayCtx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
      gradient.addColorStop(0, `rgba(${rgb},${alpha})`);
      gradient.addColorStop(0.5, `rgba(${rgb},${alpha * 0.35})`);
      gradient.addColorStop(1, `rgba(${rgb},0)`);
      overlayCtx.fillStyle = gradient;
      overlayCtx.beginPath();
      overlayCtx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
      overlayCtx.fill();

      overlayCtx.fillStyle = `rgba(${rgb},${alpha})`;
      overlayCtx.beginPath();
      overlayCtx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      overlayCtx.fill();
    });
  }

  function drawSkeleton() {
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    const w = overlay.width;
    const h = overlay.height;
    if (w === 0 || h === 0) return;

    // Confidence modulates intensity (glow/opacity), not hue -- part colors
    // stay stable so hands/pose/face remain instantly distinguishable.
    const intensity = clamp(0.45 + smoothedConfidence * 0.55, 0.45, 1);

    if (faceVisible) {
      const face = landmarkGroups.face;
      drawConnections(face.points, FACE_CONNECTIONS, face.alpha * 0.5, "255,255,255", 1.2, w, h);
    }

    if (skeletonVisible) {
      const pose = landmarkGroups.pose;
      overlayCtx.save();
      overlayCtx.shadowColor = `rgba(124,155,255,${0.5 * intensity})`;
      overlayCtx.shadowBlur = 6 + 10 * intensity;
      drawConnections(pose.points, POSE_CONNECTIONS, pose.alpha * intensity, "124,155,255", 3, w, h);
      overlayCtx.restore();
      drawGlowingJoints(pose.points, pose.alpha * intensity, "124,155,255", 3.5, w, h);

      const leftHand = landmarkGroups.leftHand;
      overlayCtx.save();
      overlayCtx.shadowColor = `rgba(51,224,194,${0.5 * intensity})`;
      overlayCtx.shadowBlur = 6 + 10 * intensity;
      drawConnections(leftHand.points, HAND_CONNECTIONS, leftHand.alpha * intensity, "51,224,194", 2.6, w, h);
      overlayCtx.restore();
      drawGlowingJoints(leftHand.points, leftHand.alpha * intensity, "51,224,194", 3, w, h);

      const rightHand = landmarkGroups.rightHand;
      overlayCtx.save();
      overlayCtx.shadowColor = `rgba(181,134,255,${0.5 * intensity})`;
      overlayCtx.shadowBlur = 6 + 10 * intensity;
      drawConnections(rightHand.points, HAND_CONNECTIONS, rightHand.alpha * intensity, "181,134,255", 2.6, w, h);
      overlayCtx.restore();
      drawGlowingJoints(rightHand.points, rightHand.alpha * intensity, "181,134,255", 3, w, h);
    }
  }

  function renderLoop() {
    if (!renderLoopActive) return;
    Object.values(landmarkGroups).forEach((g) => g.step());
    smoothedConfidence = lerp(smoothedConfidence, targetConfidence, LERP_CONFIDENCE);
    drawSkeleton();
    requestAnimationFrame(renderLoop);
  }

  function startRenderLoop() {
    if (renderLoopActive) return;
    renderLoopActive = true;
    requestAnimationFrame(renderLoop);
  }

  function stopRenderLoop() {
    renderLoopActive = false;
    Object.values(landmarkGroups).forEach((g) => {
      g.points = null;
      g.targetPoints = null;
      g.hasTarget = false;
      g.alpha = 0;
    });
    smoothedConfidence = 0;
    targetConfidence = 0;
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  }

  function restartCaptionAnimation() {
    captionText.style.animation = "none";
    void captionText.offsetWidth;
    captionText.style.animation = "";
  }

  function formatDuration(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function updateStats() {
    if (statCount) statCount.textContent = String(recognizedCount);
    if (statAvgConfidence) {
      statAvgConfidence.textContent =
        recognizedCount > 0 ? `${Math.round((confidenceSum / recognizedCount) * 100)}%` : "—";
    }
  }

  function tickDuration() {
    if (!sessionStartTime) return;
    statDuration.textContent = formatDuration((Date.now() - sessionStartTime) / 1000);
    updateStats();
  }

  function renderHistory() {
    historyCount.textContent = String(historyEntries.length);
    if (historyEntries.length === 0) {
      historyList.innerHTML = '<p class="empty-hint">Recognized signs will appear here as you sign.</p>';
      return;
    }
    historyList.innerHTML = "";
    historyEntries
      .slice()
      .reverse()
      .forEach((entry) => {
        const row = document.createElement("div");
        row.className = "history-item";
        row.innerHTML = `
          <div class="history-item-main">
            <span class="history-item-sinhala">${entry.sinhala}</span>
            <span class="history-item-gloss">${entry.gloss}</span>
          </div>
          <div class="history-item-meta">
            <span class="history-confidence-badge">${Math.round(entry.confidence * 100)}%</span>
            <span class="history-time">${entry.time}</span>
          </div>`;
        historyList.appendChild(row);
      });
  }

  function addHistoryEntry(sinhalaText, glossText, confidence) {
    recognizedCount += 1;
    confidenceSum += confidence;

    historyEntries.push({
      sinhala: sinhalaText,
      gloss: glossText,
      confidence,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });
    if (historyEntries.length > 50) historyEntries.shift();

    renderHistory();
    updateStats();
  }

  function primeAudio() {
    // Some browsers only allow audio playback that happens inside the
    // synchronous call stack of a real user gesture. Playing (and
    // immediately pausing) a near-silent clip right on the button click
    // "unlocks" audio.play() for the rest of the session.
    speechAudio.muted = true;
    speechAudio.src =
      "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID/+xDEAAPAAAGkAAAAIAAANIAAAARMQU1FMy45OS41VVVVVVVVVVVVVVVVVQ==";
    speechAudio
      .play()
      .then(() => {
        speechAudio.pause();
        speechAudio.currentTime = 0;
        speechAudio.muted = false;
      })
      .catch(() => {
        speechAudio.muted = false;
      });
  }

  function showAudioBlockedHint() {
    audioHint.classList.add("show");
  }

  // Gestures can be recognized back-to-back, faster than one spoken phrase
  // takes to play. Reusing a single <audio> element and just swapping its
  // .src for each new gesture races: calling play() again while the
  // previous playback is still settling causes the browser to silently
  // drop the new request. A small queue of independent Audio objects,
  // played one at a time, guarantees every recognized sign is actually
  // spoken, in order, without overlapping.
  const speechQueue = [];
  let speechPlaying = false;
  let pendingRetryUrl = null;

  function processSpeechQueue() {
    if (speechPlaying || speechQueue.length === 0) return;
    const text = speechQueue.shift();
    const url = `/api/speak?text=${encodeURIComponent(text)}`;
    const audioEl = new Audio(url);
    speechPlaying = true;

    const advance = () => {
      speechPlaying = false;
      processSpeechQueue();
    };
    audioEl.addEventListener("ended", advance);
    audioEl.addEventListener("error", advance);

    audioEl
      .play()
      .then(() => audioHint.classList.remove("show"))
      .catch((err) => {
        console.error("Audio playback error:", err);
        if (err.name === "NotAllowedError") {
          pendingRetryUrl = url;
          showAudioBlockedHint();
        }
        advance();
      });
  }

  function speak(text) {
    if (muted) return;
    speechQueue.push(text);
    processSpeechQueue();
  }

  function handleFrameResult(data) {
    if (frameSentTime > 0) {
      const latency = Math.round(performance.now() - frameSentTime);
      if (statLatency) statLatency.textContent = `${latency}ms`;
    }
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
      if (statFps) statFps.textContent = `${fps}`;
      frameCount = 0;
      lastFpsUpdate = now;
    }

    const progressPct = Math.min(100, Math.round((data.bufferProgress || 0) * 100));
    bufferFill.style.width = `${progressPct}%`;

    const confPct = Math.round((data.confidence || 0) * 100);
    confidenceFill.style.width = `${Math.min(100, confPct)}%`;
    confidenceValue.textContent = `${confPct}%`;
    targetConfidence = data.confidence || 0;

    const lm = data.landmarks || {};
    landmarkGroups.face.setTarget(lm.face);
    landmarkGroups.pose.setTarget(lm.pose);
    landmarkGroups.leftHand.setTarget(lm.leftHand);
    landmarkGroups.rightHand.setTarget(lm.rightHand);

    if (data.gesture && data.gesture !== lastAnnouncedGesture) {
      lastAnnouncedGesture = data.gesture;
      const sinhalaText = data.gestureSinhala || data.gesture;
      captionText.textContent = sinhalaText;
      captionText.classList.remove("placeholder");
      captionGloss.textContent = data.gesture;
      restartCaptionAnimation();
      addHistoryEntry(sinhalaText, data.gesture, data.confidence || 0);
      speak(data.gesture);
    }
  }

  function connectSocket() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${protocol}://${window.location.host}/ws/recognize`);

    ws.onopen = () => setConnectionState("connected", "Connected");
    ws.onclose = () => {
      setConnectionState(null, running ? "Reconnecting…" : "Idle");
      if (running) setTimeout(connectSocket, 1000);
    };
    ws.onerror = () => setConnectionState("error", "Connection error");
    ws.onmessage = (event) => {
      awaitingResponse = false;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "frame_result") handleFrameResult(data);
      } catch (err) {
        console.error("Bad message from server", err);
      }
    };
  }

  // The video element displays with `object-fit: cover`, which crops the
  // source to fill its box whenever the camera's native aspect ratio isn't
  // exactly 4:3 (common on laptop webcams, which are often 16:9). The
  // captured frame must be cropped the same way before being sent for
  // analysis, or the landmarks the server returns describe a wider view
  // than what's on screen and appear in the wrong place once drawn.
  function getCoverCropRect(sourceW, sourceH, targetW, targetH) {
    const sourceRatio = sourceW / sourceH;
    const targetRatio = targetW / targetH;
    let cropW = sourceW;
    let cropH = sourceH;
    if (sourceRatio > targetRatio) {
      cropW = sourceH * targetRatio;
    } else {
      cropH = sourceW / targetRatio;
    }
    return { cropX: (sourceW - cropW) / 2, cropY: (sourceH - cropH) / 2, cropW, cropH };
  }

  function captureAndSendFrame() {
    if (!ws || ws.readyState !== WebSocket.OPEN || awaitingResponse) return;
    if (!video.videoWidth || !video.videoHeight) return;

    const { cropX, cropY, cropW, cropH } = getCoverCropRect(
      video.videoWidth,
      video.videoHeight,
      CAPTURE_WIDTH,
      CAPTURE_HEIGHT
    );

    captureCtx.setTransform(-1, 0, 0, 1, CAPTURE_WIDTH, 0);
    captureCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    captureCtx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = captureCanvas.toDataURL("image/jpeg", JPEG_QUALITY);
    awaitingResponse = true;
    frameSentTime = performance.now();
    ws.send(dataUrl);
  }

  async function startCamera() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (err) {
      setConnectionState("error", "Camera permission denied");
      return;
    }

    video.srcObject = mediaStream;
    await video.play();
    videoEmpty.style.display = "none";
    recBadge.classList.add("on");
    videoWrap.classList.add("scanning");
    resizeOverlay();
    startRenderLoop();

    recognizedCount = 0;
    confidenceSum = 0;
    historyEntries.length = 0;
    renderHistory();
    // A fresh session shouldn't inherit dedup state from a previous one --
    // otherwise the first sign you show could silently go unspoken if it
    // happens to match whatever was last announced before the camera
    // stopped.
    lastAnnouncedGesture = null;
    sessionStartTime = Date.now();
    statDuration.textContent = "00:00";
    if (statFps) statFps.textContent = "—";
    if (statLatency) statLatency.textContent = "—";
    updateStats();
    durationTimer = setInterval(tickDuration, 1000);

    running = true;
    startBtn.classList.add("stop");
    startBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/></svg>
      Stop Camera`;

    connectSocket();
    captureTimer = setInterval(captureAndSendFrame, 140);
  }

  function stopCamera() {
    running = false;
    if (captureTimer) clearInterval(captureTimer);
    captureTimer = null;
    awaitingResponse = false;
    if (durationTimer) clearInterval(durationTimer);
    durationTimer = null;

    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    setConnectionState(null, "Idle");

    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    video.srcObject = null;
    videoEmpty.style.display = "flex";
    recBadge.classList.remove("on");
    videoWrap.classList.remove("scanning");
    stopRenderLoop();
    bufferFill.style.width = "0%";
    if (statFps) statFps.textContent = "—";
    if (statLatency) statLatency.textContent = "—";

    startBtn.classList.remove("stop");
    startBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3.5l4 3.5v-11l-4 3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
      Start Camera`;
  }

  startBtn.addEventListener("click", () => {
    if (running) {
      stopCamera();
    } else {
      primeAudio();
      startCamera();
    }
  });

  audioHint.addEventListener("click", () => {
    audioHint.classList.remove("show");
    if (pendingRetryUrl) {
      const url = pendingRetryUrl;
      pendingRetryUrl = null;
      new Audio(url).play().catch((err) => console.error("Retry play failed:", err));
    }
    speechPlaying = false;
    processSpeechQueue();
  });

  muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.setAttribute("aria-pressed", String(muted));
    muteLabel.textContent = muted ? "Sound off" : "Sound on";
  });

  resetBtn.addEventListener("click", () => {
    lastAnnouncedGesture = null;
    captionText.textContent = "Show a sign to begin";
    captionText.classList.add("placeholder");
    captionGloss.textContent = "";
    confidenceFill.style.width = "0%";
    confidenceValue.textContent = "0%";
    bufferFill.style.width = "0%";
    if (ws && ws.readyState === WebSocket.OPEN) ws.send("__reset__");
  });

  function openSettings() {
    closeGuide();
    settingsDrawer.classList.add("open");
    settingsScrim.classList.add("show");
  }
  function closeSettings() {
    settingsDrawer.classList.remove("open");
    if (!guideDrawer.classList.contains("open")) {
      settingsScrim.classList.remove("show");
    }
  }
  settingsBtn.addEventListener("click", openSettings);
  settingsClose.addEventListener("click", closeSettings);

  function openGuide() {
    closeSettings();
    guideDrawer.classList.add("open");
    settingsScrim.classList.add("show");
  }
  function closeGuide() {
    guideDrawer.classList.remove("open");
    if (!settingsDrawer.classList.contains("open")) {
      settingsScrim.classList.remove("show");
    }
  }
  if (guideBtn) guideBtn.addEventListener("click", openGuide);
  if (guideClose) guideClose.addEventListener("click", closeGuide);

  settingsScrim.addEventListener("click", () => {
    closeSettings();
    closeGuide();
  });

  toggleSkeleton.addEventListener("change", () => {
    skeletonVisible = toggleSkeleton.checked;
  });
  toggleFace.addEventListener("change", () => {
    faceVisible = toggleFace.checked;
  });

  fetch("/api/info")
    .then((r) => r.json())
    .then((data) => {
      infoSeqLen.textContent = `${data.sequenceLength} frames`;
      if (guideSeqLen) guideSeqLen.textContent = `${data.sequenceLength} Frames`;
      infoThreshold.textContent = `${Math.round(data.confidenceThreshold * 100)}%`;
      infoClasses.textContent = String(data.numClasses);
    })
    .catch(() => {
      infoSeqLen.textContent = infoThreshold.textContent = infoClasses.textContent = "unavailable";
    });

  function renderLabels(filter) {
    const term = (filter || "").trim().toLowerCase();
    labelsList.innerHTML = "";
    const matches = term
      ? allLabels.filter(
          (item) =>
            item.label.toLowerCase().includes(term) || item.sinhala.includes(term)
        )
      : allLabels;

    matches.slice(0, 400).forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "label-chip";
      chip.textContent = item.sinhala;
      chip.title = item.label;
      labelsList.appendChild(chip);
    });
  }

  labelSearch.addEventListener("input", () => renderLabels(labelSearch.value));

  fetch("/api/labels")
    .then((r) => r.json())
    .then((data) => {
      allLabels = data.labels || [];
      labelsCount.textContent = `${data.count} signs`;
      renderLabels("");
    })
    .catch(() => {
      labelsCount.textContent = "unavailable";
    });
})();
