import { describe, it, expect } from 'vitest'
import { extractMetadata } from './MetadataExtractor'

const PATH_LINES = [
  '#Coordinate Measurement — 2026-05-23 18:45:00',
  '#StartTime,18:44:57',
  '#EndTime,18:45:00',
  '#StartCoord,0.0000,0.0000',
  '#EndCoord,3.3976,10.6349',
  '#Distance,13.56cm',
  '#TotalPoints,95',
  '',
  'index,time,x_cm,y_cm',
]

const ANGLE_LINES = [
  '#Angle Measurement — 2026-05-23 18:48:51',
  '#StartTime,18:48:46',
  '#EndTime,18:48:51',
  '#TotalPoints,164',
  '#Angle,84.7°',
  '#Length,21.5cm',
  '',
]

describe('extractMetadata — PATH', () => {
  const meta = extractMetadata(PATH_LINES)

  it('extracts distance as number', () => {
    expect(meta.distance).toBeCloseTo(13.56)
  })

  it('extracts totalPoints', () => {
    expect(meta.totalPoints).toBe(95)
  })

  it('extracts startCoord', () => {
    expect(meta.startCoord).toEqual([0, 0])
  })

  it('extracts endCoord', () => {
    expect(meta.endCoord).toEqual([3.3976, 10.6349])
  })

  it('extracts startTime and endTime', () => {
    expect(meta.startTime).toBe('18:44:57')
    expect(meta.endTime).toBe('18:45:00')
  })

  it('preserves unknown keys in raw', () => {
    expect(meta.raw['StartTime']).toBe('18:44:57')
  })
})

describe('extractMetadata — ANGLE', () => {
  const meta = extractMetadata(ANGLE_LINES)

  it('extracts angle stripping degree symbol', () => {
    expect(meta.angle).toBeCloseTo(84.7)
  })

  it('extracts length stripping cm unit', () => {
    expect(meta.length).toBeCloseTo(21.5)
  })

  it('extracts totalPoints', () => {
    expect(meta.totalPoints).toBe(164)
  })

  it('does not set distance for ANGLE file', () => {
    expect(meta.distance).toBeUndefined()
  })
})

describe('extractMetadata — edge cases', () => {
  it('stops at first non-# line', () => {
    const lines = ['#TotalPoints,10', 'index,time,x,y', '#ShouldNotParse,999']
    const meta = extractMetadata(lines)
    expect(meta.totalPoints).toBe(10)
    expect(meta.raw['ShouldNotParse']).toBeUndefined()
  })

  it('handles empty input', () => {
    const meta = extractMetadata([])
    expect(meta.raw).toEqual({})
    expect(meta.totalPoints).toBeUndefined()
  })
})
