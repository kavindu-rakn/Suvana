/** Remove handlers before stop(): cleanup must never report a disconnect. */
export function releaseStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    track.onended = null
    track.onmute = null
    track.stop()
  })
}

export function watchStream(stream: MediaStream, disconnected: () => void) {
  stream.getVideoTracks().forEach((track) => {
    track.onended = disconnected
    track.onmute = disconnected
  })
}

/** A failed GPU setup gets exactly one CPU attempt. */
export async function withCpuFallback<T>(create: (delegate: 'GPU' | 'CPU') => Promise<T>) {
  try {
    return await create('GPU')
  } catch {
    return create('CPU')
  }
}

/** Wall-clock deadline, independent of camera frames or requestAnimationFrame. */
export function captureDeadline(maxMs: number, finish: () => void) {
  const timer = window.setTimeout(finish, maxMs)
  return () => window.clearTimeout(timer)
}
