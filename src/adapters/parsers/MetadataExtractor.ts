import type { CsvMetadata } from '../../domain/models/MarkerSession'

function parseNumber(val: string): number | undefined {
  const cleaned = val.replace(/[°\s]/g, '').replace(/cm$/, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? undefined : n
}

function parseCoord(val: string): [number, number] | undefined {
  const parts = val.split(',').map(s => parseFloat(s.trim()))
  if (parts.length === 2 && !parts.some(isNaN)) return [parts[0], parts[1]]
  return undefined
}

export function extractMetadata(rawLines: string[]): CsvMetadata {
  const raw: Record<string, string> = {}
  const meta: Partial<CsvMetadata> = { raw }

  for (const line of rawLines) {
    if (!line.startsWith('#')) break
    const content = line.slice(1).trim()
    const commaIdx = content.indexOf(',')
    if (commaIdx === -1) {
      raw[content] = ''
      continue
    }
    const key = content.slice(0, commaIdx).trim()
    const val = content.slice(commaIdx + 1).trim()
    raw[key] = val

    switch (key) {
      case 'Distance':
        meta.distance = parseNumber(val)
        break
      case 'Angle':
        meta.angle = parseNumber(val)
        break
      case 'Length':
        meta.length = parseNumber(val)
        break
      case 'TotalPoints':
        meta.totalPoints = parseNumber(val)
        break
      case 'StartCoord':
        meta.startCoord = parseCoord(val)
        break
      case 'EndCoord':
        meta.endCoord = parseCoord(val)
        break
      case 'StartTime':
        meta.startTime = val
        break
      case 'EndTime':
        meta.endTime = val
        break
    }
  }

  return meta as CsvMetadata
}
