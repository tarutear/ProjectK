import { describe, it, expect } from 'vitest'
import { inferFileType } from '../../domain/models/TestInfo'

function inferSide(filename: string): 'LEFT' | 'RIGHT' {
  const lower = filename.toLowerCase()
  if (lower.includes('_r_') || lower.includes('_right') || lower.endsWith('_r.csv') || lower.includes('right')) return 'RIGHT'
  return 'LEFT'
}

describe('file inference helpers', () => {
  describe('inferFileType', () => {
    it('returns PATH for path_ prefix', () => {
      expect(inferFileType('path_001.csv')).toBe('PATH')
    })
    it('returns ANGLE for angle_ prefix', () => {
      expect(inferFileType('angle_left.csv')).toBe('ANGLE')
    })
    it('returns null for unknown prefix', () => {
      expect(inferFileType('data.csv')).toBeNull()
    })
  })

  describe('inferSide', () => {
    it('returns RIGHT for _right in filename', () => {
      expect(inferSide('path_right_001.csv')).toBe('RIGHT')
    })
    it('returns RIGHT for _r_ in filename', () => {
      expect(inferSide('path_r_001.csv')).toBe('RIGHT')
    })
    it('returns RIGHT for ending _r.csv', () => {
      expect(inferSide('angle_001_r.csv')).toBe('RIGHT')
    })
    it('defaults to LEFT for ambiguous names', () => {
      expect(inferSide('path_left_001.csv')).toBe('LEFT')
      expect(inferSide('data.csv')).toBe('LEFT')
    })
  })
})

// pair matching logic (extracted from component)
interface Entry {
  id: string
  subjectId: string
  testId: string
  fileType: 'PATH' | 'ANGLE'
  side: 'LEFT' | 'RIGHT'
}

function computePairMap(entries: Entry[]): Set<string> {
  const map = new Map<string, string[]>()
  for (const e of entries) {
    const key = `${e.subjectId}|${e.testId}|${e.fileType}`
    const arr = map.get(key) ?? []
    arr.push(e.id)
    map.set(key, arr)
  }
  const paired = new Set<string>()
  for (const ids of map.values()) {
    if (ids.length === 2) {
      const [a, b] = ids.map(id => entries.find(e => e.id === id)!)
      if (a && b && a.side !== b.side) {
        paired.add(a.id)
        paired.add(b.id)
      }
    }
  }
  return paired
}

describe('computePairMap', () => {
  it('pairs two entries with opposite sides and same key', () => {
    const entries: Entry[] = [
      { id: 'L', subjectId: 'S1', testId: 'T1', fileType: 'PATH', side: 'LEFT' },
      { id: 'R', subjectId: 'S1', testId: 'T1', fileType: 'PATH', side: 'RIGHT' },
    ]
    const set = computePairMap(entries)
    expect(set.has('L')).toBe(true)
    expect(set.has('R')).toBe(true)
  })

  it('does not pair entries with same side', () => {
    const entries: Entry[] = [
      { id: 'L1', subjectId: 'S1', testId: 'T1', fileType: 'PATH', side: 'LEFT' },
      { id: 'L2', subjectId: 'S1', testId: 'T1', fileType: 'PATH', side: 'LEFT' },
    ]
    expect(computePairMap(entries).size).toBe(0)
  })

  it('does not pair entries with different fileTypes', () => {
    const entries: Entry[] = [
      { id: 'L', subjectId: 'S1', testId: 'T1', fileType: 'PATH', side: 'LEFT' },
      { id: 'R', subjectId: 'S1', testId: 'T1', fileType: 'ANGLE', side: 'RIGHT' },
    ]
    expect(computePairMap(entries).size).toBe(0)
  })

  it('does not pair entries with different subjectIds', () => {
    const entries: Entry[] = [
      { id: 'L', subjectId: 'S1', testId: 'T1', fileType: 'PATH', side: 'LEFT' },
      { id: 'R', subjectId: 'S2', testId: 'T1', fileType: 'PATH', side: 'RIGHT' },
    ]
    expect(computePairMap(entries).size).toBe(0)
  })

  it('handles multiple independent pairs', () => {
    const entries: Entry[] = [
      { id: 'A-L', subjectId: 'S1', testId: 'T1', fileType: 'PATH', side: 'LEFT' },
      { id: 'A-R', subjectId: 'S1', testId: 'T1', fileType: 'PATH', side: 'RIGHT' },
      { id: 'B-L', subjectId: 'S2', testId: 'T2', fileType: 'ANGLE', side: 'LEFT' },
      { id: 'B-R', subjectId: 'S2', testId: 'T2', fileType: 'ANGLE', side: 'RIGHT' },
    ]
    const set = computePairMap(entries)
    expect(set.size).toBe(4)
  })

  it('returns empty set for single entry', () => {
    const entries: Entry[] = [
      { id: 'L', subjectId: 'S1', testId: 'T1', fileType: 'PATH', side: 'LEFT' },
    ]
    expect(computePairMap(entries).size).toBe(0)
  })
})
