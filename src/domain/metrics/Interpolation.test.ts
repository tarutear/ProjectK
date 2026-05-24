import { describe, it, expect } from 'vitest'
import { linearInterpolate, CONSECUTIVE_MISSING_WARN_THRESHOLD } from './Interpolation'

interface Frame { index: number; x: number; y: number }

function f(index: number, x: number, y: number): Frame {
  return { index, x, y }
}

describe('linearInterpolate', () => {
  it('returns empty array unchanged', () => {
    const { frames } = linearInterpolate<Frame>([], ['x', 'y'])
    expect(frames).toEqual([])
  })

  it('leaves frames without missing values unchanged', () => {
    const input = [f(0, 1, 2), f(1, 3, 4)]
    const { frames } = linearInterpolate(input, ['x', 'y'])
    expect(frames[0].x).toBe(1)
    expect(frames[1].x).toBe(3)
  })

  it('interpolates single missing value between two known values', () => {
    const input = [
      f(0, 0, 0),
      { index: 1, x: NaN, y: NaN },
      f(2, 2, 4),
    ]
    const { frames } = linearInterpolate(input, ['x', 'y'])
    expect(frames[1].x).toBeCloseTo(1)
    expect(frames[1].y).toBeCloseTo(2)
  })

  it('interpolates multiple consecutive missing values', () => {
    const input = [
      f(0, 0, 0),
      { index: 1, x: NaN, y: NaN },
      { index: 2, x: NaN, y: NaN },
      f(3, 3, 6),
    ]
    const { frames } = linearInterpolate(input, ['x', 'y'])
    expect(frames[1].x).toBeCloseTo(1)
    expect(frames[2].x).toBeCloseTo(2)
  })

  it('fills leading missing values with first known value', () => {
    const input = [
      { index: 0, x: NaN, y: NaN },
      f(1, 5, 10),
    ]
    const { frames } = linearInterpolate(input, ['x'])
    expect(frames[0].x).toBe(5)
  })

  it('fills trailing missing values with last known value', () => {
    const input = [
      f(0, 5, 10),
      { index: 1, x: NaN, y: NaN },
    ]
    const { frames } = linearInterpolate(input, ['x'])
    expect(frames[1].x).toBe(5)
  })

  it('tracks consecutiveMissingMax correctly when under threshold', () => {
    const input = [
      f(0, 0, 0),
      { index: 1, x: NaN, y: NaN },
      { index: 2, x: NaN, y: NaN },
      f(3, 3, 0),
    ]
    const { consecutiveMissingMax } = linearInterpolate(input, ['x'])
    expect(consecutiveMissingMax).toBe(2)
  })

  it('reports consecutiveMissingMax exceeding threshold', () => {
    const input = [
      f(0, 0, 0),
      { index: 1, x: NaN, y: NaN },
      { index: 2, x: NaN, y: NaN },
      { index: 3, x: NaN, y: NaN },
      { index: 4, x: NaN, y: NaN },
      f(5, 5, 0),
    ]
    const { consecutiveMissingMax } = linearInterpolate(input, ['x'])
    expect(consecutiveMissingMax).toBeGreaterThanOrEqual(CONSECUTIVE_MISSING_WARN_THRESHOLD)
  })
})
