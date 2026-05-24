// "HH:MM:SS.mmm" → milliseconds since midnight
export function parseTimestamp(time: string): number {
  const parts = time.split(':')
  if (parts.length < 3) return 0
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const secParts = parts[2].split('.')
  const s = parseInt(secParts[0], 10)
  const ms = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0
  return ((h * 60 + m) * 60 + s) * 1000 + ms
}

// normalize timeMs array so first frame = 0
export function normalizeTimestamps(timesMs: number[]): number[] {
  if (timesMs.length === 0) return []
  const offset = timesMs[0]
  return timesMs.map(t => t - offset)
}
