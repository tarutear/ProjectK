import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseAngleCsv } from './AngleCsvParser'

const fixturePath = resolve(__dirname, '../../../tests/fixtures/angle_sample.csv')
let rawText: string

beforeAll(() => {
  rawText = readFileSync(fixturePath, 'utf-8')
})

describe('parseAngleCsv — metadata', () => {
  it('extracts angle', () => {
    const { metadata } = parseAngleCsv(rawText)
    expect(metadata.angle).toBeCloseTo(84.7)
  })

  it('extracts length', () => {
    const { metadata } = parseAngleCsv(rawText)
    expect(metadata.length).toBeCloseTo(21.5)
  })

  it('extracts totalPoints', () => {
    const { metadata } = parseAngleCsv(rawText)
    expect(metadata.totalPoints).toBe(164)
  })
})

describe('parseAngleCsv — frames', () => {
  it('parses correct number of frames', () => {
    const { frames } = parseAngleCsv(rawText)
    expect(frames).toHaveLength(164)
  })

  it('first frame starts at timeMs = 0', () => {
    const { frames } = parseAngleCsv(rawText)
    expect(frames[0].timeMs).toBe(0)
  })

  it('first frame pivot is at origin after normalization', () => {
    const { frames } = parseAngleCsv(rawText)
    expect(frames[0].pivotX).toBeCloseTo(0)
    expect(frames[0].pivotY).toBeCloseTo(0)
  })

  it('all frames have a computed angleDeg', () => {
    const { frames } = parseAngleCsv(rawText)
    expect(frames.every(f => typeof f.angleDeg === 'number' && !isNaN(f.angleDeg))).toBe(true)
  })

  it('timestamps are monotonically non-decreasing', () => {
    const { frames } = parseAngleCsv(rawText)
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].timeMs).toBeGreaterThanOrEqual(frames[i - 1].timeMs)
    }
  })
})

describe('parseAngleCsv — warnings', () => {
  it('has no warnings for clean fixture', () => {
    const { warnings } = parseAngleCsv(rawText)
    expect(warnings).toHaveLength(0)
  })

  it('warns on TotalPoints mismatch', () => {
    const broken = rawText.replace('#TotalPoints,164', '#TotalPoints,999')
    const { warnings } = parseAngleCsv(broken)
    expect(warnings.some(w => w.type === 'TOTAL_POINTS_MISMATCH')).toBe(true)
  })
})
