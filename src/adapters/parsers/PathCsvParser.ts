import type { PathFrame, CsvMetadata, ParseWarning } from '../../domain/models/MarkerSession'
import { extractMetadata } from './MetadataExtractor'
import { parseTimestamp, normalizeTimestamps } from './timeUtils'
import { linearInterpolate, CONSECUTIVE_MISSING_WARN_THRESHOLD } from '../../domain/metrics/Interpolation'

export interface PathParseResult {
  metadata: CsvMetadata
  frames: PathFrame[]
  warnings: ParseWarning[]
}

export function parsePathCsv(rawText: string, headerRowOverride?: number): PathParseResult {
  const allLines = rawText.replace(/^﻿/, '').split(/\r?\n/)
  const warnings: ParseWarning[] = []

  // split metadata lines (# prefix) from data lines
  let dataStartIdx = allLines.findIndex(l => l.trim() !== '' && !l.startsWith('#'))
  if (headerRowOverride !== undefined) dataStartIdx = headerRowOverride

  const metaLines = allLines.slice(0, dataStartIdx)
  const metadata = extractMetadata(metaLines)

  // header row is the first non-empty non-# line
  const headerRow = allLines[dataStartIdx]
  if (!headerRow) {
    return { metadata, frames: [], warnings: [{ type: 'PARSE_ERROR', message: 'Header row not found' }] }
  }

  const headers = headerRow.split(',').map(h => h.trim())
  const timeIdx = headers.indexOf('time')
  const xIdx = headers.indexOf('x_cm')
  const yIdx = headers.indexOf('y_cm')

  const rawFrames: PathFrame[] = []
  const dataLines = allLines.slice(dataStartIdx + 1)

  for (const line of dataLines) {
    if (line.trim() === '') continue
    const cols = line.split(',')
    const index = parseInt(cols[0], 10)
    const timeMs = parseTimestamp(cols[timeIdx]?.trim() ?? '')
    const x = parseFloat(cols[xIdx]?.trim() ?? '')
    const y = parseFloat(cols[yIdx]?.trim() ?? '')
    rawFrames.push({ index, timeMs, x, y })
  }

  // normalize timestamps relative to first frame
  const times = normalizeTimestamps(rawFrames.map(f => f.timeMs))
  rawFrames.forEach((f, i) => { f.timeMs = times[i] })

  // interpolate missing values
  const { frames, consecutiveMissingMax } = linearInterpolate<PathFrame>(rawFrames, ['x', 'y'])
  if (consecutiveMissingMax >= CONSECUTIVE_MISSING_WARN_THRESHOLD) {
    warnings.push({
      type: 'CONSECUTIVE_MISSING',
      message: `${consecutiveMissingMax} consecutive missing frames detected; linear interpolation applied`,
    })
  }

  // validate TotalPoints
  if (metadata.totalPoints !== undefined && frames.length !== metadata.totalPoints) {
    warnings.push({
      type: 'TOTAL_POINTS_MISMATCH',
      message: `Expected ${metadata.totalPoints} points but parsed ${frames.length}`,
    })
  }

  return { metadata, frames, warnings }
}
