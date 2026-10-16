import type { CurriculumUnit } from '../data/curriculum'
import { contentCoverage } from '../storage/bundledReferences'
import type { RecordingMeta } from '../vision/types'
import type { AttemptLogEntry } from './attemptLog'
import { unitState } from './game'
import type { UnitState } from './game'

/** Edition coverage takes precedence over saved stars, including stars earned
 * in a fuller edition. Keep approved units/sign order intact in the Path. */
export function pathUnitState(
  unit: CurriculumUnit, units: readonly CurriculumUnit[],
  attempts: readonly AttemptLogEntry[], index: RecordingMeta[],
): UnitState | 'preview' {
  const incomplete = (item: CurriculumUnit) =>
    item.status !== 'approved' || contentCoverage(item.signs, index).preview
  if (incomplete(unit)) return 'preview'
  const position = units.findIndex(item => item.id === unit.id)
  if (units.slice(0, position).some(incomplete)) return 'locked'
  return unitState(unit, units, attempts)
}
