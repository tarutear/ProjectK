import { describe, it, expect } from 'vitest'
import { calcTotalDistance, calcSpeedProfile, calcLinearityIndex, calcPathMetrics } from './PathMetrics'
import type { PathFrame } from '../models/MarkerSession'

function f(index: number, timeMs: number, x: number, y: number): PathFrame {
  return { index, timeMs, x, y }
}

describe('calcTotalDistance', () => {
  it('returns 0 for fewer than 2 frames', () => {
    expect(calcTotalDistance([])).toBe(0)
    expect(calcTotalDistance([f(0, 0, 0, 0)])).toBe(0)
  })

  it('computes straight line distance', () => {
    const frames = [f(0, 0, 0, 0), f(1, 100, 3, 4)]
    expect(calcTotalDistance(frames)).toBeCloseTo(5)
  })

  it('sums multiple segments', () => {
    const frames = [f(0, 0, 0, 0), f(1, 100, 1, 0), f(2, 200, 1, 1)]
    expect(calcTotalDistance(frames)).toBeCloseTo(2)
  })
})

describe('calcSpeedProfile', () => {
  it('returns empty array for fewer than 2 frames', () => {
    expect(calcSpeedProfile([])).toEqual([])
    expect(calcSpeedProfile([f(0, 0, 0, 0)])).toEqual([])
  })

  it('computes speed in cm/s', () => {
    // 10cm in 500ms = 20 cm/s
    const frames = [f(0, 0, 0, 0), f(1, 500, 10, 0)]
    const speeds = calcSpeedProfile(frames)
    expect(speeds).toHaveLength(1)
    expect(speeds[0]).toBeCloseTo(20)
  })

  it('returns 0 for zero time delta', () => {
    const frames = [f(0, 0, 0, 0), f(1, 0, 5, 0)]
    const speeds = calcSpeedProfile(frames)
    expect(speeds[0]).toBe(0)
  })
})

describe('calcLinearityIndex', () => {
  it('returns 1 for fewer than 2 frames', () => {
    expect(calcLinearityIndex([])).toBe(1)
  })

  it('returns 1.0 for perfectly straight movement', () => {
    const frames = [f(0, 0, 0, 0), f(1, 100, 5, 0), f(2, 200, 10, 0)]
    expect(calcLinearityIndex(frames)).toBeCloseTo(1.0)
  })

  it('returns value < 1 for non-straight path', () => {
    // zigzag: total distance > straight-line
    const frames = [f(0, 0, 0, 0), f(1, 100, 1, 1), f(2, 200, 0, 2)]
    const idx = calcLinearityIndex(frames)
    expect(idx).toBeLessThan(1)
    expect(idx).toBeGreaterThan(0)
  })

  it('returns 1 when start equals end (total > 0)', () => {
    const frames = [f(0, 0, 0, 0), f(1, 100, 1, 0), f(2, 200, 0, 0)]
    // straight dist = 0, total dist > 0 → index = 0
    expect(calcLinearityIndex(frames)).toBeCloseTo(0)
  })

  it('returns 1 when total distance is 0 (stationary)', () => {
    const frames = [f(0, 0, 0, 0), f(1, 100, 0, 0)]
    expect(calcLinearityIndex(frames)).toBe(1)
  })
})

describe('calcPathMetrics', () => {
  it('returns all metrics for valid frames', () => {
    const frames = [f(0, 0, 0, 0), f(1, 1000, 3, 4)]
    const result = calcPathMetrics(frames)
    expect(result.totalDistanceCm).toBeCloseTo(5)
    expect(result.linearityIndex).toBeCloseTo(1.0)
    expect(result.speedProfileCmPerSec).toHaveLength(1)
    expect(result.durationMs).toBe(1000)
  })
})
