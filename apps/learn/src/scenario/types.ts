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
  /**
   * If true, this hint describes a sign's movement or location and was
   * authored without signer verification. Hidden from learners until
   * validated by kvn or a signer; visible only in author mode.
   */
  pendingSignerValidation?: boolean
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
