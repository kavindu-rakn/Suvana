import { CONTENT_EDITION } from '../storage/bundledReferences'
import './Attribution.css'

/** Shared with the proposed learner-facing footer wiring in the L-20 handoff. */
export function ContentNotice() {
  return (
    <p className="content-notice">
      <strong>{CONTENT_EDITION === 'cc0' ? 'CC0 content preview' : 'Free academic edition · Non-commercial'}</strong>
      {' — '}
      {CONTENT_EDITION === 'cc0'
        ? 'Only CC0 references are selectable. No paid offering. No payments or ads.'
        : 'Full corpus for non-commercial academic use. No payments. No ads.'}
    </p>
  )
}

export function Attribution() {
  return (
    <aside className="attribution" aria-labelledby="attribution-heading">
      <ContentNotice />
      <h3 id="attribution-heading">Corpus credits</h3>
      <p className="attribution-intro">References contain hand landmarks extracted from corpus videos. No video frames are redistributed.</p>
      <ul>
        <li>
          <strong>D. C. Kahawearachchi et al.</strong>
          <span>Sinhala Sign Language Video Dataset · <a href="https://www.kaggle.com/datasets/dckahawearachchi/sinhala-sign-language-dataset">Kaggle source</a></span>
          <span><a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a> · modified (landmark extraction)</span>
        </li>
        <li>
          <strong>Yohan Abhishek</strong>
          <span>Sinhala Sign Language video dataset · <a href="https://www.kaggle.com/datasets/yohanabhishek/ssl400-dynamic-sri-lankan-sign-language-dataset/data">Kaggle source (SSL400)</a>{CONTENT_EDITION === 'cc0' && ' · excluded from this preview'}</span>
          <span><a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a> · modified (landmark extraction)</span>
          <span>Non-commercial; adapted landmarks retain the same licence.</span>
        </li>
      </ul>
      <a href={`${import.meta.env.BASE_URL}references/LICENSES.md`}>Full attribution and licence notes</a>
    </aside>
  )
}
