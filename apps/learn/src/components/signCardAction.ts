/** Touch browsing offers a preview first. Mouse and keyboard can open directly. */
export function signCardAction(hasPreview: boolean, touch: boolean, previewedId: string | null, id: string): 'preview' | 'select' {
  return hasPreview && touch && previewedId !== id ? 'preview' : 'select'
}
