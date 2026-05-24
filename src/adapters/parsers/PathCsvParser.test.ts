import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parsePathCsv } from './PathCsvParser'

const fixturePath = resolve(__dirname, '../../../tests/fixtures/path_sample.csv')
let rawText: string

beforeAll(() => {
  rawText = readFileSync(fixturePath, 'utf-8')
})

describe('parsePathCsv — metadata', () => {
  it('extracts distance', () => {
    const { metadata } = parsePathCsv(rawText)
    expect(metadata.distance).toBeCloseTo(13.56)
  })

  it('extracts totalPoints', () => {
    const { metadata } = parsePathCsv(rawText)
    expect(metadata.totalPoints).toBe(95)
  })

  it('extracts startCoord and endCoord', () => {
    const { metadata } = parsePathCsv(rawText)
    expect(metadata.startCoord).toEqual([0, 0])
    expect(metadata.endCoord?.[0]).toBeCloseTo(3.3976)
    expect(metadata.endCoord?.[1]).toBeCloseTo(10.6349)
  })
})

describe('parsePathCsv — frames', () => {
  it('parses correct number of frames', () => {
    const { frames } = parsePathCsv(rawText)
    expect(frames).toHaveLength(95)
  })

  it('first frame starts at timeMs = 0', () => {
    const { frames } = parsePathCsv(rawText)
    expect(frames[0].timeMs).toBe(0)
  })

  it('first frame is at origin (0, 0)', () => {
    const { frames } = parsePathCsv(rawText)
    expect(frames[0].x).toBeCloseTo(0)
    expect(frames[0].y).toBeCloseTo(0)
  })

  it('timestamps are monotonically non-decreasing', () => {
    const { frames } = parsePathCsv(rawText)
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].timeMs).toBeGreaterThanOrEqual(frames[i - 1].timeMs)
    }
  })

  it('last frame has expected coordinates', () => {
    const { frames } = parsePathCsv(rawText)
    const last = frames[frames.length - 1]
    expect(last.x).toBeCloseTo(3.3976)
    expect(last.y).toBeCloseTo(10.6349)
  })
})

describe('parsePathCsv — warnings', () => {
  it('has no warnings for clean fixture', () => {
    const { warnings } = parsePathCsv(rawText)
    expect(warnings).toHaveLength(0)
  })

  it('warns on TotalPoints mismatch', () => {
    const broken = rawText.replace('#TotalPoints,95', '#TotalPoints,999')
    const { warnings } = parsePathCsv(broken)
    expect(warnings.some(w => w.type === 'TOTAL_POINTS_MISMATCH')).toBe(true)
  })
})
