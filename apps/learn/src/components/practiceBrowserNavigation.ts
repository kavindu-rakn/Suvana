import { groupForPicker } from '../data/categories'
import type { RecordingMeta } from '../vision/types'

type BrowserReference = Pick<RecordingMeta, 'id' | 'source' | 'sourceCategory'>

/** Use the displayed group: small corpus categories are folded into Other. */
export function practiceReturnCategory(
  selected: BrowserReference | null,
  references: BrowserReference[],
): string | null {
  if (!selected) return null
  for (const [category, signs] of groupForPicker(references).byCategory) {
    if (signs.some((sign) => sign.id === selected.id)) return category
  }
  return null
}
