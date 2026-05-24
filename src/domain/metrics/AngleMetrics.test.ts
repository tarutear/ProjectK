import { describe, it, expect } from 'vitest'
import { calcAngleDeg, calcROM, calcAngularVelocity, calcSegmentLengthStability, calcAngleMetrics } from './AngleMetrics'
import type { AngleFrame } from '../models/MarkerSession'

function f(index: number, timeMs: number, pX: number, pY: number, eX: number, eY: number): AngleFrame {
  return { index, timeMs, pivotX: pX, pivotY: pY, endX: eX, endY: eY, angleDeg: calcAngleDeg(pX, pY, eX, eY) }
}

describe('calcAngleDeg', () => {
  it('returns 0 for horizontal right', () => {
    expect(calcAngleDeg(0, 0, 1, 0)).toBeCloseTo(0)
  })

  it('returns 90 for vertical up', () => {
    expect(calcAngleDeg(0, 0, 0, 1)).toBeCloseTo(90)
  })

  it('returns -90 for vertical down', () => {
    expect(calcAngleDeg(0, 0, 0, -1)).toBeCloseTo(-90)
  })

  it('returns 180 for horizontal left', () => {
    expect(Math.abs(calcAngleDeg(0, 0, -1, 0))).toBeCloseTo(180)
  })

  it('returns 45 for diagonal', () => {
    expect(calcAngleDeg(0, 0, 1, 1)).toBeCloseTo(45)
  })
})

describe('calcROM', () => {
  it('returns zeros for empty frames', () => {
    const result = calcROM([])
    expect(result).toEqual({ maxDeg: 0, minDeg: 0, romDeg: 0 })
  })

  it('computes ROM correctly', () => {
    const frames = [
      f(0, 0, 0, 0, 1, 0),    // 0°
      f(1, 100, 0, 0, 0, 1),  // 90°
      f(2, 200, 0, 0, -1, 0), // 180°
    ]
    const result = calcROM(frames)
    expect(result.maxDeg).toBeCloseTo(180)
    expect(result.minDeg).toBeCloseTo(0)
    expect(result.romDeg).toBeCloseTo(180)
  })
})

describe('calcAngularVelocity', () => {
  it('returns empty for fewer than 2 frames', () => {
    expect(calcAngularVelocity([])).toEqual([])
  })

  it('computes angular velocity in deg/s', () => {
    // from 0° to 90° in 1 second
    const frames = [f(0, 0, 0, 0, 1, 0), f(1, 1000, 0, 0, 0, 1)]
    const v = calcAngularVelocity(frames)
    expect(v).toHaveLength(1)
    expect(v[0]).toBeCloseTo(90)
  })

  it('returns negative velocity for decreasing angle', () => {
    const frames = [f(0, 0, 0, 0, 0, 1), f(1, 1000, 0, 0, 1, 0)]
    const v = calcAngularVelocity(frames)
    expect(v[0]).toBeCloseTo(-90)
  })
})

describe('calcSegmentLengthStability', () => {
  it('returns zeros for empty frames', () => {
    expect(calcSegmentLengthStability([])).toEqual({ mean: 0, sd: 0 })
  })

  it('returns sd=0 for constant length', () => {
    const frames = [f(0, 0, 0, 0, 3, 4), f(1, 100, 0, 0, 3, 4)]
    const { mean, sd } = calcSegmentLengthStability(frames)
    expect(mean).toBeCloseTo(5)
    expect(sd).toBeCloseTo(0)
  })

  it('computes non-zero sd for varying lengths', () => {
    const frames = [f(0, 0, 0, 0, 3, 4), f(1, 100, 0, 0, 0, 1)]
    const { sd } = calcSegmentLengthStability(frames)
    expect(sd).toBeGreaterThan(0)
  })
})

describe('calcAngleMetrics', () => {
  it('returns all metrics for valid frames', () => {
    const frames = [f(0, 0, 0, 0, 1, 0), f(1, 1000, 0, 0, 0, 1)]
    const result = calcAngleMetrics(frames)
    expect(result.rom.romDeg).toBeCloseTo(90)
    expect(result.angularVelocityDegPerSec).toHaveLength(1)
    expect(result.segmentLengthMeanCm).toBeCloseTo(1)
    expect(result.durationMs).toBe(1000)
  })
})
