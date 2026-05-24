import { describe, it, expect } from 'vitest'
import { findPairedSession, applyPairing } from './PairSessions'
import type { MarkerSession } from '../domain/models/MarkerSession'

function makeSession(
  id: string,
  subjectId: string,
  testId: string,
  side: 'LEFT' | 'RIGHT',
  fileType: 'PATH' | 'ANGLE' = 'PATH',
): MarkerSession {
  return {
    id,
    subject: { subjectId },
    test: { testId, side, fileType, measuredAt: new Date() },
    metadata: { raw: {} },
    frames: [],
    warnings: [],
  }
}

describe('findPairedSession', () => {
  it('finds the opposite-side session with same subject+testId+fileType', () => {
    const left = makeSession('L', 'S001', 'T1', 'LEFT')
    const right = makeSession('R', 'S001', 'T1', 'RIGHT')
    const pair = findPairedSession([left, right], left)
    expect(pair?.id).toBe('R')
  })

  it('returns undefined when no pair exists', () => {
    const left = makeSession('L', 'S001', 'T1', 'LEFT')
    expect(findPairedSession([left], left)).toBeUndefined()
  })

  it('does not pair sessions with different testIds', () => {
    const left = makeSession('L', 'S001', 'T1', 'LEFT')
    const right = makeSession('R', 'S001', 'T2', 'RIGHT')
    expect(findPairedSession([left, right], left)).toBeUndefined()
  })

  it('does not pair sessions with different subjectIds', () => {
    const left = makeSession('L', 'S001', 'T1', 'LEFT')
    const right = makeSession('R', 'S002', 'T1', 'RIGHT')
    expect(findPairedSession([left, right], left)).toBeUndefined()
  })

  it('does not pair sessions with different fileTypes', () => {
    const left = makeSession('L', 'S001', 'T1', 'LEFT', 'PATH')
    const right = makeSession('R', 'S001', 'T1', 'RIGHT', 'ANGLE')
    expect(findPairedSession([left, right], left)).toBeUndefined()
  })
})

describe('applyPairing', () => {
  it('sets pairedSessionId on both sessions when pair exists', () => {
    const left = makeSession('L', 'S001', 'T1', 'LEFT')
    const right = makeSession('R', 'S001', 'T1', 'RIGHT')
    const result = applyPairing([left, right])
    expect(result.find(s => s.id === 'L')?.pairedSessionId).toBe('R')
    expect(result.find(s => s.id === 'R')?.pairedSessionId).toBe('L')
  })

  it('leaves pairedSessionId undefined when no pair', () => {
    const left = makeSession('L', 'S001', 'T1', 'LEFT')
    const result = applyPairing([left])
    expect(result[0].pairedSessionId).toBeUndefined()
  })
})
