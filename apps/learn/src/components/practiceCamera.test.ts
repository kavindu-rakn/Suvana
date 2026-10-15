import { describe, expect, it } from 'vitest'
import { cameraIntentTransition as transition, initialCameraIntent } from './practiceCamera'

describe('practice camera intent', () => {
  it('releases hidden streams and consumes only one restart across duplicate return events', () => {
    const on = transition(initialCameraIntent(), 'start')
    expect(on.action).toBe('start')
    const away = transition(on.state, 'away')
    expect(away.action).toBe('stop')
    expect(transition(away.state, 'away').action).toBe('none')
    const returned = transition(away.state, 'return')
    expect(returned.action).toBe('start')
    expect(transition(returned.state, 'return').action).toBe('none')
  })
  it('never starts a camera that was off, manually stopped, failed or left behind', () => {
    expect(transition(transition(initialCameraIntent(), 'away').state, 'return').action).toBe('none')
    for (const event of ['stop', 'leave-surface', 'failed'] as const) {
      const away = transition(transition(initialCameraIntent(), 'start').state, 'away')
      const revoked = transition(away.state, event)
      expect(transition(revoked.state, 'return').action).toBe('none')
    }
  })
  it('defers a pending start while hidden and repeats hide/return cycles', () => {
    let state = transition(initialCameraIntent(true), 'start').state
    expect(state.restorePending).toBe(true)
    for (let i = 0; i < 4; i++) {
      const returned = transition(state, 'return')
      expect(returned.action).toBe('start')
      state = transition(returned.state, 'away').state
    }
  })
})
