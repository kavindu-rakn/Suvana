/**
 * Which keydown targets a global shortcut must leave alone.
 *
 * Text fields own every key typed into them. Buttons and links own Enter and
 * Space: the browser activates the focused control with them, so a global
 * Enter/Space shortcut would run a different action than the one the learner
 * focused (bug A2: Enter on a focused Retry went to the next sign). Other keys
 * (arrows, Esc, digits, letters) do nothing on a button, so shortcuts keep
 * working while one is focused.
 *
 * Typed against a minimal shape rather than the DOM so it runs in the node
 * test environment.
 */
interface KeyTarget {
  tagName?: string
  isContentEditable?: boolean
  parentElement?: KeyTarget | null
}

const TEXT_ENTRY_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
const ACTIVATABLE_TAGS = new Set([...TEXT_ENTRY_TAGS, 'BUTTON', 'A'])

function withinTags(target: unknown, tags: Set<string>): boolean {
  let node = target as KeyTarget | null | undefined
  while (node) {
    if (node.isContentEditable) return true
    if (node.tagName && tags.has(node.tagName.toUpperCase())) return true
    node = node.parentElement
  }
  return false
}

/** True when the target takes typed text (input, textarea, select, contenteditable). */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  return withinTags(target, TEXT_ENTRY_TAGS)
}

/** True when the target acts on Enter/Space itself (text entry, button, link). */
export function isActivatableTarget(target: EventTarget | null): boolean {
  return withinTags(target, ACTIVATABLE_TAGS)
}

/**
 * True when a global shortcut for `key` must not run for this target: text
 * fields keep every key, and buttons and links keep Enter and Space.
 */
export function shortcutBlockedByTarget(key: string, target: EventTarget | null): boolean {
  if (key === 'Enter' || key === ' ' || key === 'Spacebar') return isActivatableTarget(target)
  return isTextEntryTarget(target)
}
