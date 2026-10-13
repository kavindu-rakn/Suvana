/** First-run flag for the Practice guide (Onboarding.tsx), in localStorage. */

const SEEN_KEY = 'suvana.learn.onboarding-seen'

/** True once the learner has finished or closed the guide. Blocked storage reads as unseen. */
export function onboardingSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboardingSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Blocked storage: the guide shows again next visit, which is harmless.
  }
}
