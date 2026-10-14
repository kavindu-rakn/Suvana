import { useEffect, useSyncExternalStore } from 'react'
import { getHandLandmarker, handTrackerLoadStatus, subscribeHandTracker } from './handTracker'

/** Preparation never asks for the camera. A failed warm-up can be retried by
 * the normal camera start; an unmounted view never writes component state. */
export function useHandTrackerPreparation(enabled: boolean) {
  const status = useSyncExternalStore(subscribeHandTracker, handTrackerLoadStatus)
  useEffect(() => {
    if (enabled) void getHandLandmarker().catch(() => { /* start() reports load failures */ })
  }, [enabled])
  return status === 'loading'
}
