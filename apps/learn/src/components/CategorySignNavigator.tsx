import { useMemo, useState } from 'react'
import type { RecordingMeta } from '../vision/types'
import { categoriesIn, categoryOf, orderSigns } from '../data/categories'
import { matchesSearch, translationOf } from '../data/translations'

export interface CategorySignNavigatorProps {
  references: RecordingMeta[]
  suggested?: string | null
  selectedId?: string | null
  mode?: 'practice' | 'record'
  isModal?: boolean
  onSelect: (sign: RecordingMeta) => void
  onCreateCustom?: (gloss: string) => void
  onClose?: () => void
  /** Fired as the pointer / focus moves over a sign card, for a live preview.
   *  Null when nothing is hovered. */
  onPreview?: (sign: RecordingMeta | null) => void
}

export function CategorySignNavigator({
  references,
  suggested = null,
  selectedId = null,
  mode = 'practice',
  isModal = false,
  onSelect,
  onCreateCustom,
  onClose,
  onPreview,
}: CategorySignNavigatorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [globalQuery, setGlobalQuery] = useState('')
  const [categoryQuery, setCategoryQuery] = useState('')

  // Unique categories list
  const categories = useMemo(() => categoriesIn(references), [references])

  // Signs grouped by category for quick lookup
  const signsByCategory = useMemo(() => {
    const map = new Map<string, RecordingMeta[]>()
    for (const cat of categories) {
      map.set(cat, [])
    }
    for (const ref of references) {
      const cat = categoryOf(ref)
      const list = map.get(cat)
      if (list) {
        list.push(ref)
      } else {
        map.set(cat, [ref])
      }
    }
    return map
  }, [categories, references])

  // Global search results across all categories
  const globalSearchResults = useMemo(() => {
    const q = globalQuery.trim()
    if (!q) return []
    return references.filter((r) => matchesSearch(r.gloss, q))
  }, [references, globalQuery])

  // Scoped search results in selected category
  const categorySigns = useMemo(() => {
    if (!selectedCategory) return []
    const list = signsByCategory.get(selectedCategory) ?? []
    const q = categoryQuery.trim()
    const filtered = q ? list.filter((r) => matchesSearch(r.gloss, q)) : list
    return orderSigns(selectedCategory, filtered)
  }, [selectedCategory, signsByCategory, categoryQuery])

  // Suggested sign record
  const suggestedRec = useMemo(() => {
    if (!suggested) return null
    return references.find((r) => r.gloss === suggested) ?? null
  }, [references, suggested])

  const isSearchingGlobal = globalQuery.trim().length > 0

  return (
    <div className={`cs-nav-container ${isModal ? 'cs-nav-modal' : 'cs-nav-pane'}`}>
      {/* Header / Topbar */}
      <div className="cs-nav-header">
        <div className="cs-nav-header-left">
          {selectedCategory && !isSearchingGlobal ? (
            <div className="cs-nav-breadcrumbs">
              <button
                type="button"
                className="cs-back-btn"
                onClick={() => {
                  setSelectedCategory(null)
                  setCategoryQuery('')
                }}
                aria-label="Back to all categories"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Categories</span>
              </button>
              <span className="cs-crumb-sep">/</span>
              <span className="cs-crumb-current">
                <strong>{selectedCategory}</strong>
                <span className="cs-crumb-count">
                  ({signsByCategory.get(selectedCategory)?.length ?? 0})
                </span>
              </span>
            </div>
          ) : (
            <div className="cs-nav-title-group">
              <h2 className="cs-nav-title">
                {mode === 'record' ? 'Select Sign' : 'Categories'}
              </h2>
              <p className="cs-nav-subtitle">
                {references.length} signs in {categories.length} categories
              </p>
            </div>
          )}
        </div>

        {isModal && onClose && (
          <button type="button" className="btn btn-ghost cs-close-btn" onClick={onClose} aria-label="Close dialog">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="cs-search-row">
        {selectedCategory && !isSearchingGlobal ? (
          <div className="cs-search-input-wrap">
            <svg className="cs-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="cs-search-input"
              value={categoryQuery}
              onChange={(e) => setCategoryQuery(e.target.value)}
              placeholder={`Search within ${selectedCategory}...`}
              autoComplete="off"
              spellCheck={false}
            />
            {categoryQuery && (
              <button
                type="button"
                className="cs-search-clear"
                onClick={() => setCategoryQuery('')}
                aria-label="Clear filter"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="cs-search-input-wrap">
            <svg className="cs-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="cs-search-input"
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder={`Search ${references.length} signs...`}
              autoComplete="off"
              spellCheck={false}
            />
            {globalQuery && (
              <button
                type="button"
                className="cs-search-clear"
                onClick={() => setGlobalQuery('')}
                aria-label="Clear search"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Step 1: Categories Grid or Global Search Results */}
      {!selectedCategory && !isSearchingGlobal && (
        <div className="cs-category-view">
          {/* Suggested Sign Quick-Pick Banner */}
          {suggestedRec && mode === 'practice' && (
            <div className="cs-suggested-banner" onClick={() => onSelect(suggestedRec)} role="button" tabIndex={0}>
              <div className="cs-suggested-left">
                <span className="cs-suggested-tag">SUGGESTED</span>
                <h3 className="cs-suggested-gloss">{suggestedRec.gloss}</h3>
                {translationOf(suggestedRec.gloss) && (
                  <span className="cs-suggested-sub">"{translationOf(suggestedRec.gloss)}"</span>
                )}
              </div>
              <button type="button" className="btn small cs-suggested-btn">
                Select
              </button>
            </div>
          )}

          {/* Admin Custom Mode Action Card */}
          {mode === 'record' && onCreateCustom && (
            <div className="cs-custom-gloss-card">
              <div className="cs-custom-info">
                <h4>Custom Sign</h4>
                <p>Record a new sign not in the corpus.</p>
              </div>
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  const input = window.prompt('Enter new uppercase gloss name (e.g., HELLO_WORLD):')
                  if (input && input.trim()) {
                    onCreateCustom(input.trim().toUpperCase())
                  }
                }}
              >
                + New Sign
              </button>
            </div>
          )}

          {/* Categories Grid (Clean compact tiles) */}
          <div className="cs-categories-grid">
            {categories.map((catName) => {
              const catSigns = signsByCategory.get(catName) ?? []
              return (
                <div
                  key={catName}
                  className="cs-category-card"
                  onClick={() => {
                    setSelectedCategory(catName)
                    setCategoryQuery('')
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedCategory(catName)
                      setCategoryQuery('')
                    }
                  }}
                >
                  <span className="cs-cat-name" title={catName}>{catName}</span>
                  <span className="cs-cat-badge">{catSigns.length}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Global Search Results Grid */}
      {!selectedCategory && isSearchingGlobal && (
        <div className="cs-search-results-view">
          <div className="cs-results-bar">
            <span><strong>{globalSearchResults.length}</strong> matching signs</span>
          </div>

          {globalSearchResults.length === 0 ? (
            <div className="cs-empty-state">
              <p>No signs match "{globalQuery}".</p>
              {mode === 'record' && onCreateCustom && (
                <button
                  type="button"
                  className="btn small"
                  style={{ marginTop: '12px' }}
                  onClick={() => onCreateCustom(globalQuery.trim().toUpperCase())}
                >
                  + Record "{globalQuery.trim().toUpperCase()}"
                </button>
              )}
            </div>
          ) : (
            <div className="cs-signs-grid" onMouseLeave={() => onPreview?.(null)}>
              {globalSearchResults.map((r) => {
                const meaning = translationOf(r.gloss)
                const isSelected = selectedId === r.id
                const isSuggested = suggested === r.gloss
                return (
                  <div
                    key={r.id}
                    className={`cs-sign-card ${isSelected ? 'selected' : ''} ${isSuggested ? 'suggested' : ''}`}
                    onClick={() => onSelect(r)}
                    onMouseEnter={() => onPreview?.(r)}
                    onFocus={() => onPreview?.(r)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onSelect(r)
                    }}
                  >
                    <div className="cs-sign-top">
                      <span className="cs-sign-cat-tag">{categoryOf(r)}</span>
                      {isSuggested && <span className="badge cs-suggested-chip">Suggested</span>}
                      {r.source === 'team-recording' && <span className="badge cs-team-chip">Team</span>}
                    </div>

                    <h4 className="cs-sign-gloss">{r.gloss}</h4>
                    {meaning && <p className="cs-sign-meaning">"{meaning}"</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Signs List/Grid for Selected Category */}
      {selectedCategory && (
        <div className="cs-category-signs-view">
          {categorySigns.length === 0 ? (
            <div className="cs-empty-state">
              <p>No signs found matching "{categoryQuery}".</p>
              <button
                type="button"
                className="btn btn-ghost small"
                onClick={() => setCategoryQuery('')}
              >
                Show all {signsByCategory.get(selectedCategory)?.length ?? 0}
              </button>
            </div>
          ) : (
            <div className="cs-signs-grid" onMouseLeave={() => onPreview?.(null)}>
              {categorySigns.map((r) => {
                const meaning = translationOf(r.gloss)
                const isSelected = selectedId === r.id
                const isSuggested = suggested === r.gloss
                return (
                  <div
                    key={r.id}
                    className={`cs-sign-card ${isSelected ? 'selected' : ''} ${isSuggested ? 'suggested' : ''}`}
                    onClick={() => onSelect(r)}
                    onMouseEnter={() => onPreview?.(r)}
                    onFocus={() => onPreview?.(r)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onSelect(r)
                    }}
                  >
                    <div className="cs-sign-main">
                      <h4 className="cs-sign-gloss">{r.gloss}</h4>
                      {meaning && <p className="cs-sign-meaning">"{meaning}"</p>}
                    </div>

                    {(isSuggested || r.source === 'team-recording') && (
                      <div className="cs-sign-badges">
                        {isSuggested && <span className="badge cs-suggested-chip">Suggested</span>}
                        {r.source === 'team-recording' && <span className="badge cs-team-chip">Team</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
