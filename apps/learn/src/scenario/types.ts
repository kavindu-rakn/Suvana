/**
 * Scenario scripts are plain data. Adding another scenario means authoring a
 * JSON file in src/data/scenarios/ and listing it in scenarios.ts — no engine
 * changes. The five proposal-approved scenarios are meant to arrive that way.
 */
export interface ScenarioTurn {
  id: string
  /** What the conversation partner does, in English. */
  partnerLine: string
  /** Optional gloss for the partner's own sign — a hook for the 3D avatar. */
  partnerGloss?: string
  /** What the learner is being asked to do, in English. */
  prompt: string
  /** The single gloss the learner must produce this turn. */
  gloss: string
  hint?: string
}

export interface Scenario {
  id: string
  title: string
  subtitle: string
  description: string
  /** Validation status of the authored conversation — surfaced in the UI. */
  _draftNote: string
  turns: ScenarioTurn[]
}
