import introductions from './introductions.json'
import restaurant from './restaurant.json'
import type { Scenario } from '../../scenario/types'

/**
 * Every scenario the app can run. Both of these are among the five scenarios
 * approved in the proposal. Adding the remaining three means authoring another
 * JSON file and listing it here — no engine changes.
 *
 * Introductions runs on team recordings (provisional); Restaurant runs entirely
 * on references converted from the Kaggle corpus, so it is the one to demo when
 * reference quality matters.
 */
export const SCENARIOS: Scenario[] = [introductions as Scenario, restaurant as Scenario]
