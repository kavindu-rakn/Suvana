import { useEffect, useMemo, useState } from 'react'
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
import { PracticeSpotlight } from './PracticeSpotlight'
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

const categoryTones = ['teal', 'gold', 'coral', 'iris'] as const

export function PracticeBrowser({
  references,
  loading,
  onSelect,
  onPreview,
}: {
  references: RecordingMeta[]
  loading: boolean
  onSelect: (sign: RecordingMeta) => void
  onPreview: (sign: RecordingMeta) => void
}) {
  const [category, setCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const { order, byCategory } = useMemo(() => groupForPicker(references), [references])
  const signs = useMemo(() => {
    const source = category ? (byCategory.get(category) ?? []) : references
    return orderSignsVerifiedFirst(
      category ?? '',
      source.filter((sign) => matchesSearch(sign.gloss, query.trim())),
    )
  }, [references, byCategory, category, query])

  useEffect(() => {
    const search = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.key !== '/' ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTextEntryTarget(event.target) ||
        document.querySelector('dialog[open]')
      )
        return
      event.preventDefault()
      setSearchOpen(true)
    }
    window.addEventListener('keydown', search)
    return () => window.removeEventListener('keydown', search)
  }, [])

  return (
    <div className="practice-browser">
      <div className="practice-search-rail">
        <button
          className="practice-search"
          aria-label="Find a sign"
          aria-haspopup="dialog"
          aria-keyshortcuts="/"
          onClick={() => setSearchOpen(true)}
        >
          <Search size={18} aria-hidden="true" />
          <span>Find a sign</span>
          <kbd aria-hidden="true">/</kbd>
        </button>
      </div>
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
            <h1>{category ?? 'Explore the signs'}</h1>
            <p className="practice-collection-totals" role="status">
              {loading ? (
                'Loading signs…'
              ) : category ? (
                <span>
                  <strong>{signs.length}</strong> {signs.length === 1 ? 'sign' : 'signs'}
                </span>
              ) : (
                <>
                  <span>
                    <strong>{references.length}</strong> signs
                  </span>
                  <span className="practice-totals-divider" aria-hidden="true" />
                  <span>
                    <strong>{order.length}</strong> categories
                  </span>
                </>
              )}
            </p>
          </div>
          {category && (
            <div className="practice-category-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                aria-label={`Search within ${category}`}
                placeholder="Find a sign"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Clear search">
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>
        {!loading && !category ? (
          <div className="practice-category-grid">
            {order.map((name, index) => {
              const Icon = categoryIcons[name as keyof typeof categoryIcons] ?? Shapes
              return (
                <button
                  key={name}
                  className="practice-category"
                  data-tone={categoryTones[index % categoryTones.length]}
                  onClick={() => setCategory(name)}
                >
                  <span className="practice-category-icon">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <div className="practice-category-bottom">
                    <div>
                      <h3>{name}</h3>
                      <span>
                        <strong>{byCategory.get(name)?.length ?? 0}</strong> signs
                      </span>
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
                      <article
                        className="practice-sign"
                        data-tone={
                          categoryTones[
                            Math.max(0, order.indexOf(categoryOf(sign))) % categoryTones.length
                          ]
                        }
                        key={sign.id}
                      >
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
      <PracticeSpotlight
        open={searchOpen}
        references={references}
        onClose={() => setSearchOpen(false)}
        onSelect={onSelect}
      />
    </div>
  )
}
