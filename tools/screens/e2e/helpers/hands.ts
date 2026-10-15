export const mockHandDetectionScript = () => {
  let originalDetect: ((...args: unknown[]) => unknown) | undefined
  Object.defineProperty(Object.prototype, 'detectForVideo', {
    configurable: true,
    set(fn: (...args: unknown[]) => unknown) {
      originalDetect = fn
    },
    get() {
      return function (this: unknown, ...args: unknown[]) {
        if ((window as unknown as { __mockHands?: boolean }).__mockHands) {
          return {
            landmarks: [
              Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 })),
            ],
            worldLandmarks: [
              Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 })),
            ],
            handedness: [[{ categoryName: 'Right', displayName: 'Right', score: 0.99 }]],
          }
        }
        return originalDetect
          ? originalDetect.apply(this, args)
          : { landmarks: [], worldLandmarks: [], handedness: [] }
      }
    },
  })
}
