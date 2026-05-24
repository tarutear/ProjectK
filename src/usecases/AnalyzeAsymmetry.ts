import type { MarkerSession, PathFrame, AngleFrame } from '../domain/models/MarkerSession'
import {
  calcAsymmetryFromPaths,
  calcAsymmetryFromAngles,
  type AsymmetryResult,
} from '../domain/metrics/AsymmetryMetrics'
import { calcTotalDistance } from '../domain/metrics/PathMetrics'

export interface AsymmetryAnalysis {
  asymmetry: AsymmetryResult
  thresholdPct: number
  exceedsThreshold: boolean
}

export function analyzeAsymmetry(
  left: MarkerSession,
  right: MarkerSession,
  thresholdPct = 10,
): AsymmetryAnalysis {
  let asymmetry: AsymmetryResult

  if (left.test.fileType === 'PATH') {
    const lf = left.frames as PathFrame[]
    const rf = right.frames as PathFrame[]
    asymmetry = calcAsymmetryFromPaths(lf, rf, calcTotalDistance(lf), calcTotalDistance(rf))
  } else {
    asymmetry = calcAsymmetryFromAngles(left.frames as AngleFrame[], right.frames as AngleFrame[])
  }

  return { asymmetry, thresholdPct, exceedsThreshold: asymmetry.ai > thresholdPct }
}
