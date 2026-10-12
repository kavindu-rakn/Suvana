import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Binary,
  Calendar,
  CalendarDays,
  Car,
  FolderPlus,
  Hash,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Palette,
  Plus,
  Search,
  Shapes,
  Sparkles,
  TrendingUp,
  Type,
  Users,
  Utensils,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import type { RecordingMeta } from '../vision/types'
import { categoryOf, foldedCategoryOf, groupForPicker, orderSigns } from '../data/categories'
import { matchesSearch, translationOf } from '../data/translations'

export interface CategorySignNavigatorProps {
  references: RecordingMeta[]
  suggested?: string | null
  selectedId?: string | null
  mode?: 'practice' | 'record'
  onSelect: (sign: RecordingMeta) => void
  onCreateCustom?: (gloss: string) => void
  /** Fired as the pointer / focus moves over a sign card, for a live preview. */
  onPreview?: (sign: RecordingMeta | null) => void
}

function getCategoryLucideIcon(cat: string) {
  switch (cat) {
    case 'A-Z':
      return <Type size={16} />
    case 'Numbers':
      return <Binary size={16} />
    case '20-99':
      return <Hash size={16} />
    case '100-1 million':
      return <TrendingUp size={16} />
    case 'Days':
      return <Calendar size={16} />
    case 'Months':
      return <CalendarDays size={16} />
    case 'Greetings':
      return <MessageCircle size={16} />
    case 'People':
      return <Users size={16} />
    case 'Places':
      return <MapPin size={16} />
    case 'Verbs':
      return <Zap size={16} />
    case 'Nouns':
      return <Package size={16} />
    case 'Adjectives':
      return <Sparkles size={16} />
    case 'Adverb':
      return <Wind size={16} />
    case 'Preposition':
      return <Navigation size={16} />
    case 'Colors':
      return <Palette size={16} />
    case 'Vehicles':
      return <Car size={16} />
    case 'Food':
      return <Utensils size={16} />
    case 'Additional words':
      return <FolderPlus size={16} />
    default:
      return <Shapes size={16} />
  }
}

export function CategorySignNavigator({
  references,
  suggested = null,
  selectedId = null,
  mode = 'practice',
  onSelect,
  onCreateCustom,
  onPreview,
}: CategorySignNavigatorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [globalQuery, setGlobalQuery] = useState('')
  const [categoryQuery, setCategoryQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut '/' to instantly focus search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Display order and buckets in one pass
  const { order: categories, byCategory: signsByCategory } = useMemo(
    () => groupForPicker(references),
    [references],
  )

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
    <div className="cs-nav-container cs-nav-pane">
      {/* Luxury Suvana Header */}
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
                title="Back to all categories"
              >
                <ArrowLeft size={14} />
                <span>Categories</span>
              </button>
              <span className="cs-crumb-sep">/</span>
              <div className="cs-crumb-current-wrap">
                <span className="cs-crumb-icon">{getCategoryLucideIcon(selectedCategory)}</span>
                <span className="cs-crumb-name">{selectedCategory}</span>
                <span className="cs-crumb-badge">
                  {signsByCategory.get(selectedCategory)?.length ?? 0}
                </span>
              </div>
            </div>
          ) : (
            <div className="cs-nav-title-group">
              <div className="cs-nav-eyebrow-row">
                <span className="cs-nav-eyebrow">
                  <span className="cs-nav-eyebrow-dot" />
                  CORPUS EXPLORER
                </span>
              </div>
              <h2 className="cs-nav-title">
                {mode === 'record' ? 'Select Sign' : 'Categories'}
              </h2>
              <div className="cs-nav-meta-row">
                <span className="cs-nav-stat">
                  <strong>{references.length}</strong> signs
                </span>
                <span className="cs-nav-dot-sep">•</span>
                <span className="cs-nav-stat">
                  <strong>{categories.length}</strong> categories
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Luxury Search Capsule */}
      <div className="cs-search-row">
        {selectedCategory && !isSearchingGlobal ? (
          <div className="cs-search-input-wrap">
            <Search className="cs-search-icon" size={15} />
            <input
              ref={searchInputRef}
              type="text"
              className="cs-search-input"
              value={categoryQuery}
              onChange={(e) => setCategoryQuery(e.target.value)}
              placeholder={`Search within ${selectedCategory}...`}
              autoComplete="off"
              spellCheck={false}
            />
            {categoryQuery ? (
              <button
                type="button"
                className="cs-search-clear"
                onClick={() => setCategoryQuery('')}
                aria-label="Clear filter"
                title="Clear"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="cs-search-kbd" title="Press / to search">/</kbd>
            )}
          </div>
        ) : (
          <div className="cs-search-input-wrap">
            <Search className="cs-search-icon" size={15} />
            <input
              ref={searchInputRef}
              type="text"
              className="cs-search-input"
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder={`Search ${references.length} signs (e.g. Ayubowan, Numbers)...`}
              autoComplete="off"
              spellCheck={false}
            />
            {globalQuery ? (
              <button
                type="button"
                className="cs-search-clear"
                onClick={() => setGlobalQuery('')}
                aria-label="Clear search"
                title="Clear"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="cs-search-kbd" title="Press / to search">/</kbd>
            )}
          </div>
        )}
      </div>

      {/* Step 1: Categories Grid or Global Search Results */}
      {!selectedCategory && !isSearchingGlobal && (
        <div className="cs-category-view">
          {/* Suggested Sign Quick-Pick Banner */}
          {suggestedRec && mode === 'practice' && (
            <div
              className="cs-suggested-banner"
              onClick={() => onSelect(suggestedRec)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(suggestedRec)
              }}
            >
              <div className="cs-suggested-left">
                <div className="cs-suggested-tag-row">
                  <span className="cs-suggested-tag">
                    <span className="cs-suggested-dot" />
                    DAILY RECOMMENDATION
                  </span>
                  <span className="cs-suggested-cat">{categoryOf(suggestedRec)}</span>
                </div>
                <div className="cs-suggested-title-row">
                  <h3 className="cs-suggested-gloss">{suggestedRec.gloss}</h3>
                  {translationOf(suggestedRec.gloss) && (
                    <span className="cs-suggested-sub" lang="si">
                      {translationOf(suggestedRec.gloss)}
                    </span>
                  )}
                </div>
              </div>
              <button type="button" className="btn small cs-suggested-btn">
                <span>Practise</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Author-only custom gloss card */}
          {mode === 'record' && onCreateCustom && (
            <div className="cs-custom-gloss-card">
              <div className="cs-custom-info">
                <h4>Not in the corpus?</h4>
                <p>Record a sign that has no reference yet.</p>
              </div>
              <button type="button" className="btn small" onClick={() => onCreateCustom('')}>
                <Plus size={14} />
                Record a new sign
              </button>
            </div>
          )}

          {/* Categories Grid */}
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
                  <div className="cs-cat-icon-wrap">
                    {getCategoryLucideIcon(catName)}
                  </div>
                  <div className="cs-cat-card-inner">
                    <span className="cs-cat-name" title={catName}>{catName}</span>
                    <span className="cs-cat-badge">{catSigns.length}</span>
                  </div>
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
                  <Plus size={14} />
                  Record "{globalQuery.trim().toUpperCase()}"
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
                    {meaning && (
                      <p className="cs-sign-meaning" lang="si">{meaning}</p>
                    )}
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
                      {foldedCategoryOf(r) && foldedCategoryOf(r) !== selectedCategory && (
                        <span className="cs-sign-cat-tag">{foldedCategoryOf(r)}</span>
                      )}
                      <h4 className="cs-sign-gloss">{r.gloss}</h4>
                      {meaning && (
                        <p className="cs-sign-meaning" lang="si">{meaning}</p>
                      )}
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
