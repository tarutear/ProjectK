import type { PathFrame, AngleFrame } from '../models/MarkerSession'

export interface AsymmetryResult {
  ai: number
  maxAsymmetry: number
  meanAsymmetry: number
  frameDeltas: number[]
}

export function calcAsymmetryIndex(left: number, right: number): number {
  const avg = (left + right) / 2
  if (avg === 0) return 0
  return (Math.abs(left - right) / avg) * 100
}

function euclidDist(a: PathFrame, b: PathFrame): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

export function calcFrameAsymmetry(
  leftFrames: PathFrame[],
  rightFrames: PathFrame[],
): number[] {
  const len = Math.min(leftFrames.length, rightFrames.length)
  if (len < 2) return []

  const deltas: number[] = []
  for (let i = 1; i < len; i++) {
    const leftDist = euclidDist(leftFrames[i - 1], leftFrames[i])
    const rightDist = euclidDist(rightFrames[i - 1], rightFrames[i])
    deltas.push(Math.abs(leftDist - rightDist))
  }
  return deltas
}

export function calcAsymmetryFromPaths(
  leftFrames: PathFrame[],
  rightFrames: PathFrame[],
  leftTotalDist: number,
  rightTotalDist: number,
): AsymmetryResult {
  const frameDeltas = calcFrameAsymmetry(leftFrames, rightFrames)
  const ai = calcAsymmetryIndex(leftTotalDist, rightTotalDist)
  const maxAsymmetry = frameDeltas.length > 0 ? Math.max(...frameDeltas) : 0
  const meanAsymmetry =
    frameDeltas.length > 0 ? frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length : 0

  return { ai, maxAsymmetry, meanAsymmetry, frameDeltas }
}

export function calcAsymmetryFromAngles(
  leftFrames: AngleFrame[],
  rightFrames: AngleFrame[],
): AsymmetryResult {
  const leftROM = Math.max(...leftFrames.map(f => f.angleDeg)) - Math.min(...leftFrames.map(f => f.angleDeg))
  const rightROM = Math.max(...rightFrames.map(f => f.angleDeg)) - Math.min(...rightFrames.map(f => f.angleDeg))
  const ai = calcAsymmetryIndex(leftROM, rightROM)

  const len = Math.min(leftFrames.length, rightFrames.length)
  const frameDeltas: number[] = []
  for (let i = 0; i < len; i++) {
    frameDeltas.push(Math.abs(leftFrames[i].angleDeg - rightFrames[i].angleDeg))
  }

  const maxAsymmetry = frameDeltas.length > 0 ? Math.max(...frameDeltas) : 0
  const meanAsymmetry = frameDeltas.length > 0 ? frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length : 0

  return { ai, maxAsymmetry, meanAsymmetry, frameDeltas }
}
