import type { AsymmetryResult } from '../../domain/metrics/AsymmetryMetrics'

export interface AsymmetryChartPoint {
  frameIndex: number
  delta: number
  exceedsThreshold: boolean
}

export function toAsymmetryChartData(
  result: AsymmetryResult,
  thresholdPct: number,
): AsymmetryChartPoint[] {
  const avgDist = result.frameDeltas.length > 0
    ? result.frameDeltas.reduce((a, b) => a + b, 0) / result.frameDeltas.length
    : 1

  return result.frameDeltas.map((delta, i) => ({
    frameIndex: i,
    delta,
    exceedsThreshold: avgDist > 0 ? (delta / avgDist) * 100 > thresholdPct : false,
  }))
}
