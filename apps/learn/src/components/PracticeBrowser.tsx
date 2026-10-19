import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Eye,
  Hash,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Search,
  Shapes,
  Sparkles,
  Type,
  Users,
  X,
  Zap,
} from 'lucide-react'
import type { RecordingMeta } from '../vision/types'
import { categoryOf, groupForPicker } from '../data/categories'
import { glossLabel, matchesSearch, translationOf } from '../data/translations'
import { hasMeaningCoverage, orderSignsVerifiedFirst } from '../data/meaningCoverage'
import { isTextEntryTarget } from '../app/keyboard'
import './PracticeBrowser.css'

const categoryIcons = {
  Verbs: Zap,
  Nouns: Package,
  Adjectives: Sparkles,
  People: Users,
  'A-Z': Type,
  Days: CalendarDays,
  Months: CalendarDays,
  Colors: Palette,
  Places: MapPin,
  Greetings: MessageCircle,
  Numbers: Hash,
  '20-99': Hash,
  '100-1 million': Hash,
}

export function PracticeBrowser({
  references,
  suggested,
  loading,
  onSelect,
  onPreview,
}: {
  references: RecordingMeta[]
  suggested: string | null
  loading: boolean
  onSelect: (sign: RecordingMeta) => void
  onPreview: (sign: RecordingMeta) => void
}) {
  const [category, setCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const { order, byCategory } = useMemo(() => groupForPicker(references), [references])
  const recommendation = references.find((sign) => sign.gloss === suggested)
  const searching = query.trim().length > 0
  const signs = useMemo(() => {
    const source = category ? (byCategory.get(category) ?? []) : references
    return orderSignsVerifiedFirst(
      category ?? '',
      source.filter((sign) => matchesSearch(sign.gloss, query.trim())),
    )
  }, [references, byCategory, category, query])

  useEffect(() => {
    const search = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== '/' || isTextEntryTarget(event.target)) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', search)
    return () => window.removeEventListener('keydown', search)
  }, [])

  return (
    <div className="practice-browser">
      <header className="practice-welcome">
        <div>
          <p className="practice-kicker">
            <span /> Your practice space
          </p>
          <h1>One sign at a time.</h1>
          <p>Watch closely. Try it yourself. Find your rhythm.</p>
        </div>
        <ol className="practice-flow" aria-label="How practice works">
          <li>
            <span>01</span>
            <div>
              <strong>Watch</strong>
              <small>Take a closer look</small>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Try</strong>
              <small>Follow with your hands</small>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Recall</strong>
              <small>Practise from memory</small>
            </div>
          </li>
        </ol>
      </header>

      {recommendation && !category && !searching && (
        <section className="practice-pick" aria-label="Suggested sign">
          <div className="practice-pick-icon">
            <Sparkles size={22} aria-hidden="true" />
          </div>
          <div className="practice-pick-copy">
            <p className="practice-kicker">
              A place to start{' '}
              <span className="practice-pick-category">{categoryOf(recommendation)}</span>
            </p>
            <h2>{glossLabel(recommendation.gloss)}</h2>
          </div>
          <button
            className="practice-button practice-primary"
            onClick={() => onSelect(recommendation)}
          >
            Practise <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>
      )}

      <section className="practice-collection" aria-label="Choose a sign">
        <div className="practice-collection-toolbar">
          <div className="practice-collection-title">
            {category && (
              <button
                className="practice-icon-button"
                onClick={() => {
                  setCategory(null)
                  setQuery('')
                }}
                aria-label="Back to all categories"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2>{category ?? (searching ? 'Search results' : 'Explore the signs')}</h2>
              <p>
                {loading
                  ? 'Loading your signs…'
                  : category || searching
                    ? `${signs.length} ${signs.length === 1 ? 'sign' : 'signs'}`
                    : `${references.length} signs · ${order.length} categories`}
              </p>
            </div>
          </div>
          <div className="practice-search">
            <Search size={18} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={category ? `Search within ${category}` : 'Search all signs'}
              placeholder={
                category ? `Search ${category.toLowerCase()}…` : 'Find a sign or meaning…'
              }
            />
            {query ? (
              <button
                onClick={() => {
                  setQuery('')
                  searchRef.current?.focus()
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : (
              <kbd aria-hidden="true">/</kbd>
            )}
          </div>
        </div>

        {!loading && !category && !searching ? (
          <div className="practice-category-grid">
            {order.map((name, index) => {
              const Icon = categoryIcons[name as keyof typeof categoryIcons] ?? Shapes
              return (
                <button key={name} className="practice-category" onClick={() => setCategory(name)}>
                  <div className="practice-category-top">
                    <span className="practice-category-icon">
                      <Icon size={21} aria-hidden="true" />
                    </span>
                    <span className="practice-category-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="practice-category-bottom">
                    <div>
                      <h3>{name}</h3>
                      <span>{byCategory.get(name)?.length ?? 0} signs</span>
                    </div>
                    <ArrowRight size={17} aria-hidden="true" />
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          !loading && (
            <>
              {signs.length ? (
                <div className="practice-sign-grid">
                  {signs.map((sign) => {
                    const meaning = translationOf(sign.gloss)
                    return (
                      <article className="practice-sign" key={sign.id}>
                        <span className="practice-sign-category">{categoryOf(sign)}</span>
                        <button
                          className="practice-sign-select"
                          onClick={() => onSelect(sign)}
                          aria-label={`Watch ${glossLabel(sign.gloss)}`}
                        >
                          <h3>{meaning ?? sign.gloss}</h3>
                          {meaning && <span>{sign.gloss}</span>}
                        </button>
                        {!hasMeaningCoverage(sign.gloss) && (
                          <small className="practice-unverified">Meaning not yet verified</small>
                        )}
                        <div className="practice-sign-actions">
                          <button
                            onClick={() => onPreview(sign)}
                            aria-label={`Preview ${glossLabel(sign.gloss)}`}
                          >
                            <Eye size={15} aria-hidden="true" /> Preview
                          </button>
                          <button
                            onClick={() => onSelect(sign)}
                            aria-label={`Practise ${glossLabel(sign.gloss)}`}
                          >
                            Watch <ArrowRight size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="practice-empty" role="status">
                  <Search size={28} aria-hidden="true" />
                  <h3>No signs found</h3>
                  <p>Try another gloss or English meaning.</p>
                  <button
                    className="practice-button practice-secondary"
                    onClick={() => {
                      setQuery('')
                      setCategory(null)
                    }}
                  >
                    Show all categories
                  </button>
                </div>
              )}
            </>
          )
        )}
        {loading && (
          <div className="practice-empty" role="status">
            <BookOpen size={28} aria-hidden="true" />
            <p>Getting your practice space ready…</p>
          </div>
        )}
        {!loading && references.length === 0 && (
          <p className="practice-empty" role="status">
            No reference signs are available. Reload to try again.
          </p>
        )}
      </section>
      <p className="practice-browser-note">
        <BookOpen size={15} aria-hidden="true" /> Choose any sign. Go at your own pace.
      </p>
    </div>
  )
}
