import type { ScenarioTurn } from './types'

/** Existing authored hints await a signer. Never teach them to learners. */
export function scenarioHint(turn: ScenarioTurn, isAuthorMode: boolean): string | undefined {
  return isAuthorMode ? turn.hint : undefined
}
