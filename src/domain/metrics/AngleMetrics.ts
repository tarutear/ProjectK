import type { AngleFrame } from '../models/MarkerSession'

export interface ROMResult {
  maxDeg: number
  minDeg: number
  romDeg: number
}

export interface AngleMetricsResult {
  rom: ROMResult
  angularVelocityDegPerSec: number[]
  segmentLengthMeanCm: number
  segmentLengthSdCm: number
  durationMs: number
}

export function calcAngleDeg(pivotX: number, pivotY: number, endX: number, endY: number): number {
  return (Math.atan2(endY - pivotY, endX - pivotX) * 180) / Math.PI
}

export function calcROM(frames: AngleFrame[]): ROMResult {
  if (frames.length === 0) return { maxDeg: 0, minDeg: 0, romDeg: 0 }
  const angles = frames.map(f => f.angleDeg)
  const maxDeg = Math.max(...angles)
  const minDeg = Math.min(...angles)
  return { maxDeg, minDeg, romDeg: maxDeg - minDeg }
}

export function calcAngularVelocity(frames: AngleFrame[]): number[] {
  if (frames.length < 2) return []
  return frames.slice(1).map((f, i) => {
    const dt = (f.timeMs - frames[i].timeMs) / 1000
    if (dt <= 0) return 0
    return (f.angleDeg - frames[i].angleDeg) / dt
  })
}

function segmentLength(f: AngleFrame): number {
  return Math.sqrt((f.endX - f.pivotX) ** 2 + (f.endY - f.pivotY) ** 2)
}

export function calcSegmentLengthStability(frames: AngleFrame[]): { mean: number; sd: number } {
  if (frames.length === 0) return { mean: 0, sd: 0 }
  const lengths = frames.map(segmentLength)
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length
  return { mean, sd: Math.sqrt(variance) }
}

export function calcAngleMetrics(frames: AngleFrame[]): AngleMetricsResult {
  const { mean, sd } = calcSegmentLengthStability(frames)
  return {
    rom: calcROM(frames),
    angularVelocityDegPerSec: calcAngularVelocity(frames),
    segmentLengthMeanCm: mean,
    segmentLengthSdCm: sd,
    durationMs: frames.length < 2 ? 0 : frames[frames.length - 1].timeMs - frames[0].timeMs,
  }
}
