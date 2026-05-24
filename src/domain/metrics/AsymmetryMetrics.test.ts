import { describe, it, expect } from 'vitest'
import { calcAsymmetryIndex, calcFrameAsymmetry, calcAsymmetryFromPaths } from './AsymmetryMetrics'
import type { PathFrame } from '../models/MarkerSession'

function p(index: number, x: number, y: number): PathFrame {
  return { index, timeMs: index * 100, x, y }
}

describe('calcAsymmetryIndex', () => {
  it('returns 0 for perfectly symmetric values', () => {
    expect(calcAsymmetryIndex(10, 10)).toBe(0)
  })

  it('returns 0 when both values are 0', () => {
    expect(calcAsymmetryIndex(0, 0)).toBe(0)
  })

  it('returns 100 when one side is zero and other is non-zero', () => {
    // AI = |10 - 0| / ((10 + 0)/2) * 100 = 10/5 * 100 = 200 -- capped only if needed
    // Actually: |10-0|/5 * 100 = 200
    expect(calcAsymmetryIndex(10, 0)).toBeCloseTo(200)
  })

  it('computes correct AI for asymmetric values', () => {
    // AI = |8 - 12| / 10 * 100 = 40
    expect(calcAsymmetryIndex(8, 12)).toBeCloseTo(40)
  })
})

describe('calcFrameAsymmetry', () => {
  it('returns empty array for fewer than 2 frames', () => {
    expect(calcFrameAsymmetry([], [])).toEqual([])
    expect(calcFrameAsymmetry([p(0, 0, 0)], [p(0, 0, 0)])).toEqual([])
  })

  it('returns zeros for identical left and right paths', () => {
    const frames = [p(0, 0, 0), p(1, 1, 0), p(2, 2, 0)]
    const deltas = calcFrameAsymmetry(frames, frames)
    expect(deltas.every(d => d === 0)).toBe(true)
  })

  it('computes frame-wise distance differences', () => {
    const left = [p(0, 0, 0), p(1, 3, 4)] // dist = 5
    const right = [p(0, 0, 0), p(1, 0, 1)] // dist = 1
    const deltas = calcFrameAsymmetry(left, right)
    expect(deltas[0]).toBeCloseTo(4) // |5 - 1|
  })
})

describe('calcAsymmetryFromPaths', () => {
  it('returns zero ai and deltas for identical paths', () => {
    const frames = [p(0, 0, 0), p(1, 3, 4), p(2, 6, 8)]
    const result = calcAsymmetryFromPaths(frames, frames, 10, 10)
    expect(result.ai).toBe(0)
    expect(result.maxAsymmetry).toBe(0)
    expect(result.meanAsymmetry).toBe(0)
  })

  it('returns non-zero ai for asymmetric total distances', () => {
    const left = [p(0, 0, 0), p(1, 3, 4)]
    const right = [p(0, 0, 0), p(1, 0, 1)]
    const result = calcAsymmetryFromPaths(left, right, 5, 1)
    expect(result.ai).toBeGreaterThan(0)
  })
})
