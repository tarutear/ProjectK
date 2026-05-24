import type { MarkerSession, PathFrame, AngleFrame } from '../domain/models/MarkerSession'
import { calcPathMetrics, type PathMetricsResult } from '../domain/metrics/PathMetrics'
import { calcAngleMetrics, type AngleMetricsResult } from '../domain/metrics/AngleMetrics'

export type SingleAnalysisResult =
  | { type: 'PATH'; metrics: PathMetricsResult }
  | { type: 'ANGLE'; metrics: AngleMetricsResult }

export function analyzeSingle(session: MarkerSession): SingleAnalysisResult {
  if (session.test.fileType === 'PATH') {
    return { type: 'PATH', metrics: calcPathMetrics(session.frames as PathFrame[]) }
  }
  return { type: 'ANGLE', metrics: calcAngleMetrics(session.frames as AngleFrame[]) }
}
