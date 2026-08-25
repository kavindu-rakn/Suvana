/**
 * Tab identity, split out of App.tsx so the hero can hand back the tab it
 * wants opened without importing the component that renders it.
 */
export type Tab = 'practice' | 'scenario' | 'record' | 'library' | 'progress' | 'study'

export const ALL_TABS: Record<Tab, string> = {
  practice: 'Practice',
  scenario: 'Scenario',
  progress: 'Progress',
  record: 'Record',
  library: 'Library',
  study: 'Study',
}

/** What a learner sees. Record and Library author reference data; Study is the
 *  researcher's pilot tooling. None of the three is the learner's job. */
export const LEARNER_TABS: Tab[] = ['practice', 'scenario', 'progress']
export const AUTHOR_TABS: Tab[] = [...LEARNER_TABS, 'record', 'library', 'study']

/**
 * Tab glyphs. Inline paths rather than an icon package — six icons is not
 * worth a dependency, and these inherit currentColor so they follow the tab's
 * active/inactive state for free. They are decorative: every tab keeps its
 * text label, so the icon is never the only cue.
 */
export const ICONS: Record<Tab, string> = {
  // a hand, mid-sign
  practice:
    'M8 11V6.5a1.5 1.5 0 0 1 3 0V11m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6.5a1.5 1.5 0 0 1 3 0V13a6 6 0 0 1-6 6a5 5 0 0 1-4.3-2.4L6 14.6a1.5 1.5 0 0 1 2.5-1.6',
  // a speech bubble
  scenario: 'M20 12a7 7 0 0 1-7 7H8l-4 3v-10a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7Z',
  // a record dot
  record: 'M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16Zm0 4.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7Z',
  // stacked cards
  library: 'M4 7h16M4 12h16M4 17h10',
  // a rising bar chart
  progress: 'M4 20V12m5 8V5m5 15v-6m5 6V9',
  // a clipboard
  study: 'M9 4h6v3H9zM9 5.5H6v14h12v-14h-3M9 12h6M9 16h4',
}
