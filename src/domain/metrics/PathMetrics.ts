import type { PathFrame } from '../models/MarkerSession'

export interface PathMetricsResult {
  totalDistanceCm: number
  linearityIndex: number
  speedProfileCmPerSec: number[]
  durationMs: number
}

function dist(a: PathFrame, b: PathFrame): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

export function calcTotalDistance(frames: PathFrame[]): number {
  if (frames.length < 2) return 0
  let total = 0
  for (let i = 1; i < frames.length; i++) {
    total += dist(frames[i - 1], frames[i])
  }
  return total
}

export function calcSpeedProfile(frames: PathFrame[]): number[] {
  if (frames.length < 2) return []
  return frames.slice(1).map((f, i) => {
    const dt = (f.timeMs - frames[i].timeMs) / 1000
    if (dt <= 0) return 0
    return dist(frames[i], f) / dt
  })
}

export function calcLinearityIndex(frames: PathFrame[]): number {
  if (frames.length < 2) return 1
  const first = frames[0]
  const last = frames[frames.length - 1]
  const straightLine = dist(first, last)
  const total = calcTotalDistance(frames)
  if (total === 0) return 1
  return straightLine / total
}

export function calcPathMetrics(frames: PathFrame[]): PathMetricsResult {
  return {
    totalDistanceCm: calcTotalDistance(frames),
    linearityIndex: calcLinearityIndex(frames),
    speedProfileCmPerSec: calcSpeedProfile(frames),
    durationMs: frames.length < 2 ? 0 : frames[frames.length - 1].timeMs - frames[0].timeMs,
  }
}
