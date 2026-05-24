import type { AngleFrame, CsvMetadata, ParseWarning } from '../../domain/models/MarkerSession'
import { extractMetadata } from './MetadataExtractor'
import { parseTimestamp, normalizeTimestamps } from './timeUtils'
import { calcAngleDeg } from '../../domain/metrics/AngleMetrics'
import { linearInterpolate, CONSECUTIVE_MISSING_WARN_THRESHOLD } from '../../domain/metrics/Interpolation'

export interface AngleParseResult {
  metadata: CsvMetadata
  frames: AngleFrame[]
  warnings: ParseWarning[]
}

export function parseAngleCsv(rawText: string, headerRowOverride?: number): AngleParseResult {
  const allLines = rawText.replace(/^﻿/, '').split(/\r?\n/)
  const warnings: ParseWarning[] = []

  let dataStartIdx = allLines.findIndex(l => l.trim() !== '' && !l.startsWith('#'))
  if (headerRowOverride !== undefined) dataStartIdx = headerRowOverride

  const metaLines = allLines.slice(0, dataStartIdx)
  const metadata = extractMetadata(metaLines)

  // angle files have a 2-row header: group header + column names
  // detect group header: starts with commas (e.g. ",,Ball(Pivot),,Ball(End),")
  let headerIdx = dataStartIdx
  const potentialGroupHeader = allLines[dataStartIdx]?.trim()
  if (potentialGroupHeader && potentialGroupHeader.startsWith(',')) {
    headerIdx = dataStartIdx + 1
  }

  const columnRow = allLines[headerIdx]
  if (!columnRow) {
    return { metadata, frames: [], warnings: [{ type: 'PARSE_ERROR', message: 'Header row not found' }] }
  }

  // rename duplicate x_cm/y_cm columns: [index, time, pivot_x, pivot_y, end_x, end_y]
  const headers = columnRow.split(',').map(h => h.trim())
  let xCount = 0
  const colNames = headers.map(h => {
    if (h === 'x_cm') { xCount++; return xCount === 1 ? 'pivot_x' : 'end_x' }
    if (h === 'y_cm') return xCount === 1 ? 'pivot_y' : 'end_y'
    return h
  })

  const timeIdx = colNames.indexOf('time')
  const pivotXIdx = colNames.indexOf('pivot_x')
  const pivotYIdx = colNames.indexOf('pivot_y')
  const endXIdx = colNames.indexOf('end_x')
  const endYIdx = colNames.indexOf('end_y')

  const rawFrames: AngleFrame[] = []
  const dataLines = allLines.slice(headerIdx + 1)

  for (const line of dataLines) {
    if (line.trim() === '') continue
    const cols = line.split(',')
    const index = parseInt(cols[0], 10)
    const timeMs = parseTimestamp(cols[timeIdx]?.trim() ?? '')
    const pivotX = parseFloat(cols[pivotXIdx]?.trim() ?? '')
    const pivotY = parseFloat(cols[pivotYIdx]?.trim() ?? '')
    const endX = parseFloat(cols[endXIdx]?.trim() ?? '')
    const endY = parseFloat(cols[endYIdx]?.trim() ?? '')
    const angleDeg = calcAngleDeg(pivotX, pivotY, endX, endY)
    rawFrames.push({ index, timeMs, pivotX, pivotY, endX, endY, angleDeg })
  }

  // normalize timestamps
  const times = normalizeTimestamps(rawFrames.map(f => f.timeMs))
  rawFrames.forEach((f, i) => { f.timeMs = times[i] })

  // origin-normalize pivot to (0, 0) using first frame offset
  if (rawFrames.length > 0) {
    const offsetX = rawFrames[0].pivotX
    const offsetY = rawFrames[0].pivotY
    for (const f of rawFrames) {
      f.pivotX -= offsetX
      f.pivotY -= offsetY
      f.endX -= offsetX
      f.endY -= offsetY
      f.angleDeg = calcAngleDeg(f.pivotX, f.pivotY, f.endX, f.endY)
    }
  }

  // interpolate missing values
  const { frames, consecutiveMissingMax } = linearInterpolate<AngleFrame>(
    rawFrames, ['pivotX', 'pivotY', 'endX', 'endY'],
  )
  // recalculate angleDeg after interpolation
  for (const f of frames) {
    f.angleDeg = calcAngleDeg(f.pivotX as number, f.pivotY as number, f.endX as number, f.endY as number)
  }

  if (consecutiveMissingMax >= CONSECUTIVE_MISSING_WARN_THRESHOLD) {
    warnings.push({
      type: 'CONSECUTIVE_MISSING',
      message: `${consecutiveMissingMax} consecutive missing frames detected; linear interpolation applied`,
    })
  }

  if (metadata.totalPoints !== undefined && frames.length !== metadata.totalPoints) {
    warnings.push({
      type: 'TOTAL_POINTS_MISMATCH',
      message: `Expected ${metadata.totalPoints} points but parsed ${frames.length}`,
    })
  }

  return { metadata, frames, warnings }
}
