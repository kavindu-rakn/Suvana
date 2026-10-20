import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Search, X } from 'lucide-react'
import type { RecordingMeta } from '../vision/types'
import { categoryOf } from '../data/categories'
import { matchesSearch, translationOf } from '../data/translations'
import { orderSignsVerifiedFirst } from '../data/meaningCoverage'
import { nextPracticeSearchResult, practiceSearchViewport } from './practiceSearchNavigation'
import './PracticeSpotlight.css'

const VISIBLE_RESULTS = 10

export function PracticeSpotlight({
  open,
  references,
  onClose,
  onSelect,
}: {
  open: boolean
  references: RecordingMeta[]
  onClose: () => void
  onSelect: (sign: RecordingMeta) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const matches = useMemo(
    () =>
      query.trim()
        ? orderSignsVerifiedFirst(
            '',
            references.filter((sign) => matchesSearch(sign.gloss, query.trim())),
          )
        : [],
    [references, query],
  )
  const results = matches.slice(0, VISIBLE_RESULTS)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      dialogRef.current?.showModal()
      inputRef.current?.focus()
    } else if (dialogRef.current?.open) dialogRef.current.close()
  }, [open])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!open || !viewport) return
    const fit = () => {
      const panel = practiceSearchViewport(viewport.height, viewport.offsetTop)
      dialogRef.current?.style.setProperty('--spotlight-mobile-top', `${panel.top}px`)
      dialogRef.current?.style.setProperty('--spotlight-mobile-height', `${panel.maxHeight}px`)
    }
    fit()
    viewport.addEventListener('resize', fit)
    viewport.addEventListener('scroll', fit)
    return () => {
      viewport.removeEventListener('resize', fit)
      viewport.removeEventListener('scroll', fit)
    }
  }, [open])

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, listId, open])

  function close() {
    dialogRef.current?.close()
    onClose()
  }

  function choose(sign: RecordingMeta) {
    close()
    onSelect(sign)
  }

  return (
    <dialog
      className="practice-spotlight"
      ref={dialogRef}
      aria-label="Find a sign"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const box = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          close()
      }}
    >
      <div className="practice-spotlight-field">
        <Search size={22} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Find a sign"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={results.length > 0}
          aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Find a sign"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((index) =>
                nextPracticeSearchResult(index, results.length, event.key === 'ArrowDown' ? 1 : -1),
              )
            } else if (event.key === 'Enter' && results[active]) {
              event.preventDefault()
              choose(results[active])
            }
          }}
        />
        <button className="practice-spotlight-close" onClick={close} aria-label="Close search">
          <X size={18} aria-hidden="true" />
          <kbd aria-hidden="true">esc</kbd>
        </button>
      </div>
      <div className="practice-spotlight-body">
        <p className="practice-spotlight-status" role="status">
          {query.trim()
            ? matches.length
              ? `${matches.length} ${matches.length === 1 ? 'sign' : 'signs'} found${matches.length > VISIBLE_RESULTS ? ` · first ${VISIBLE_RESULTS} shown` : ''}`
              : 'No signs found. Try another gloss or meaning.'
            : 'Search by gloss or verified English meaning.'}
        </p>
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching signs"
          className="practice-spotlight-results"
        >
          {results.map((sign, index) => (
            <li
              id={`${listId}-${index}`}
              key={sign.id}
              role="option"
              aria-selected={index === active}
              onPointerMove={() => setActive(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(sign)}
            >
              <span className="practice-spotlight-result-icon">
                <Search size={16} aria-hidden="true" />
              </span>
              <span className="practice-spotlight-result-copy">
                <strong>{translationOf(sign.gloss) ?? sign.gloss}</strong>
                {translationOf(sign.gloss) && <small>{sign.gloss}</small>}
              </span>
              <span className="practice-spotlight-result-category">{categoryOf(sign)}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </li>
          ))}
        </ul>
      </div>
      <footer className="practice-spotlight-footer">
        <span>
          <ArrowUp size={12} aria-hidden="true" />
          <ArrowDown size={12} aria-hidden="true" /> navigate
        </span>
        <span>
          <kbd>↵</kbd> open sign
        </span>
        <span>
          <kbd>esc</kbd> close
        </span>
      </footer>
    </dialog>
  )
}
