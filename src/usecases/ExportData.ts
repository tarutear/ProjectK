import type { MarkerSession, PathFrame, AngleFrame } from '../domain/models/MarkerSession'
import { analyzeSingle } from './AnalyzeSingle'
import { analyzeAsymmetry } from './AnalyzeAsymmetry'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function buildSummaryCsvRows(session: MarkerSession, paired?: MarkerSession): { headers: string[]; row: string[] } {
  const analysis = analyzeSingle(session)
  const pairedAnalysis = paired ? analyzeSingle(paired) : undefined
  const asymmetry =
    paired
      ? analyzeAsymmetry(
          session.test.side === 'LEFT' ? session : paired,
          session.test.side === 'RIGHT' ? session : paired,
        )
      : undefined

  const headers: string[] = ['subjectId', 'testId', 'measuredAt', 'side', 'fileType', 'frames', 'warnings']
  const row: string[] = [
    session.subject.subjectId,
    session.test.testId,
    session.test.measuredAt.toISOString(),
    session.test.side,
    session.test.fileType,
    String(session.frames.length),
    String(session.warnings.length),
  ]

  if (analysis.type === 'PATH') {
    const m = analysis.metrics
    headers.push('totalDistance_cm', 'linearityIndex', 'duration_s', 'deviceDistance_cm')
    row.push(m.totalDistanceCm.toFixed(4), m.linearityIndex.toFixed(4), (m.durationMs / 1000).toFixed(4), session.metadata.distance?.toFixed(4) ?? '')
  } else {
    const m = analysis.metrics
    headers.push('maxAngle_deg', 'minAngle_deg', 'rom_deg', 'segmentLengthMean_cm', 'segmentLengthSd_cm')
    row.push(m.rom.maxDeg.toFixed(4), m.rom.minDeg.toFixed(4), m.rom.romDeg.toFixed(4), m.segmentLengthMeanCm.toFixed(4), m.segmentLengthSdCm.toFixed(4))
  }

  if (paired && pairedAnalysis && asymmetry) {
    if (pairedAnalysis.type === 'PATH') {
      const m = pairedAnalysis.metrics
      headers.push('pair_totalDistance_cm', 'pair_linearityIndex', 'pair_duration_s')
      row.push(m.totalDistanceCm.toFixed(4), m.linearityIndex.toFixed(4), (m.durationMs / 1000).toFixed(4))
    } else {
      const m = pairedAnalysis.metrics
      headers.push('pair_maxAngle_deg', 'pair_minAngle_deg', 'pair_rom_deg')
      row.push(m.rom.maxDeg.toFixed(4), m.rom.minDeg.toFixed(4), m.rom.romDeg.toFixed(4))
    }
    headers.push('ai_pct', 'maxAsymmetry', 'meanAsymmetry')
    row.push(asymmetry.asymmetry.ai.toFixed(4), asymmetry.asymmetry.maxAsymmetry.toFixed(4), asymmetry.asymmetry.meanAsymmetry.toFixed(4))
  }

  return { headers, row }
}

export function exportSummaryCsv(session: MarkerSession, paired?: MarkerSession) {
  const { headers, row } = buildSummaryCsvRows(session, paired)
  const csv = [headers.join(','), row.join(',')].join('\n')
  const filename = `${session.subject.subjectId}_${session.test.testId}_${session.test.side}_summary.csv`
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), filename)
}

export function exportFramesCsv(session: MarkerSession) {
  let headers: string[]
  let rows: string[][]

  if (session.test.fileType === 'PATH') {
    headers = ['index', 'timeMs', 'x_cm', 'y_cm']
    rows = (session.frames as PathFrame[]).map(f => [String(f.index), String(f.timeMs), f.x.toFixed(4), f.y.toFixed(4)])
  } else {
    headers = ['index', 'timeMs', 'pivotX_cm', 'pivotY_cm', 'endX_cm', 'endY_cm', 'angleDeg']
    rows = (session.frames as AngleFrame[]).map(f => [
      String(f.index), String(f.timeMs),
      f.pivotX.toFixed(4), f.pivotY.toFixed(4),
      f.endX.toFixed(4), f.endY.toFixed(4),
      f.angleDeg.toFixed(4),
    ])
  }

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const filename = `${session.subject.subjectId}_${session.test.testId}_${session.test.side}_frames.csv`
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), filename)
}

export function exportAllJson(sessions: MarkerSession[]) {
  const data = sessions.map(s => ({
    ...s,
    test: { ...s.test, measuredAt: s.test.measuredAt.toISOString() },
  }))
  const filename = `sessions_${new Date().toISOString().slice(0, 10)}.json`
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename)
}
