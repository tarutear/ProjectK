import { describe, it, expect } from 'vitest'
import { buildSummaryCsvRows } from './ExportData'
import type { MarkerSession, PathFrame, AngleFrame } from '../domain/models/MarkerSession'

function makePathSession(id: string, side: 'LEFT' | 'RIGHT', frames: PathFrame[]): MarkerSession {
  return {
    id,
    subject: { subjectId: 'S001' },
    test: { testId: 'T1', side, fileType: 'PATH', measuredAt: new Date('2025-01-01') },
    metadata: { raw: {}, distance: 25.5 },
    frames,
    warnings: [],
  }
}

function makeAngleSession(id: string, side: 'LEFT' | 'RIGHT', frames: AngleFrame[]): MarkerSession {
  return {
    id,
    subject: { subjectId: 'S001' },
    test: { testId: 'T1', side, fileType: 'ANGLE', measuredAt: new Date('2025-01-01') },
    metadata: { raw: {} },
    frames,
    warnings: [],
  }
}

const pathFrames: PathFrame[] = [
  { index: 0, timeMs: 0, x: 0, y: 0 },
  { index: 1, timeMs: 100, x: 1, y: 0 },
  { index: 2, timeMs: 200, x: 2, y: 0 },
]

const angleFrames: AngleFrame[] = [
  { index: 0, timeMs: 0, pivotX: 0, pivotY: 0, endX: 5, endY: 0, angleDeg: 0 },
  { index: 1, timeMs: 100, pivotX: 0, pivotY: 0, endX: 4, endY: 3, angleDeg: 30 },
  { index: 2, timeMs: 200, pivotX: 0, pivotY: 0, endX: 0, endY: 5, angleDeg: 90 },
]

describe('buildSummaryCsvRows — PATH single', () => {
  const session = makePathSession('L', 'LEFT', pathFrames)
  const { headers, row } = buildSummaryCsvRows(session)

  it('includes required base columns', () => {
    expect(headers).toContain('subjectId')
    expect(headers).toContain('testId')
    expect(headers).toContain('side')
    expect(headers).toContain('fileType')
    expect(headers).toContain('frames')
  })

  it('includes PATH-specific metrics', () => {
    expect(headers).toContain('totalDistance_cm')
    expect(headers).toContain('linearityIndex')
    expect(headers).toContain('duration_s')
  })

  it('does not include asymmetry columns when unpaired', () => {
    expect(headers).not.toContain('ai_pct')
    expect(headers).not.toContain('pair_totalDistance_cm')
  })

  it('row values match header count', () => {
    expect(row.length).toBe(headers.length)
  })

  it('subjectId value is correct', () => {
    expect(row[headers.indexOf('subjectId')]).toBe('S001')
  })

  it('side value is correct', () => {
    expect(row[headers.indexOf('side')]).toBe('LEFT')
  })

  it('frames count is correct', () => {
    expect(row[headers.indexOf('frames')]).toBe('3')
  })
})

describe('buildSummaryCsvRows — PATH paired', () => {
  const left = makePathSession('L', 'LEFT', pathFrames)
  const right = makePathSession('R', 'RIGHT', pathFrames)
  const { headers, row } = buildSummaryCsvRows(left, right)

  it('includes asymmetry columns when paired', () => {
    expect(headers).toContain('ai_pct')
    expect(headers).toContain('maxAsymmetry')
    expect(headers).toContain('meanAsymmetry')
  })

  it('includes paired-side metrics', () => {
    expect(headers).toContain('pair_totalDistance_cm')
    expect(headers).toContain('pair_linearityIndex')
  })

  it('row values match header count', () => {
    expect(row.length).toBe(headers.length)
  })

  it('ai_pct is a valid number string', () => {
    const ai = parseFloat(row[headers.indexOf('ai_pct')])
    expect(isNaN(ai)).toBe(false)
    expect(ai).toBeGreaterThanOrEqual(0)
  })
})

describe('buildSummaryCsvRows — ANGLE single', () => {
  const session = makeAngleSession('L', 'LEFT', angleFrames)
  const { headers, row } = buildSummaryCsvRows(session)

  it('includes ANGLE-specific metrics', () => {
    expect(headers).toContain('rom_deg')
    expect(headers).toContain('maxAngle_deg')
    expect(headers).toContain('minAngle_deg')
    expect(headers).toContain('segmentLengthMean_cm')
  })

  it('does not include PATH-specific metrics', () => {
    expect(headers).not.toContain('totalDistance_cm')
    expect(headers).not.toContain('linearityIndex')
  })

  it('row values match header count', () => {
    expect(row.length).toBe(headers.length)
  })

  it('rom_deg is a valid positive number', () => {
    const rom = parseFloat(row[headers.indexOf('rom_deg')])
    expect(rom).toBeGreaterThan(0)
  })
})
