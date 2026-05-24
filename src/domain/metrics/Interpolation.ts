export const CONSECUTIVE_MISSING_WARN_THRESHOLD = 3

export interface InterpolationResult<T> {
  frames: T[]
  consecutiveMissingMax: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

function isMissing(val: unknown): boolean {
  return val === null || val === undefined || (typeof val === 'number' && isNaN(val))
}

export function linearInterpolate<T extends AnyRecord>(
  frames: T[],
  fields: (keyof T & string)[],
): InterpolationResult<T> {
  if (frames.length === 0) return { frames: [], consecutiveMissingMax: 0 }

  const result: AnyRecord[] = frames.map(f => ({ ...f }))
  let consecutiveMissingMax = 0

  for (const field of fields) {
    let streak = 0
    let streakMax = 0

    for (let i = 0; i < result.length; i++) {
      if (isMissing(result[i][field])) {
        streak++
        streakMax = Math.max(streakMax, streak)

        let nextIdx = i + 1
        while (nextIdx < result.length && isMissing(result[nextIdx][field])) nextIdx++

        let prevIdx = i - 1
        while (prevIdx >= 0 && isMissing(result[prevIdx][field])) prevIdx--

        if (prevIdx >= 0 && nextIdx < result.length) {
          const prev = result[prevIdx][field] as number
          const next = result[nextIdx][field] as number
          const t = (i - prevIdx) / (nextIdx - prevIdx)
          result[i][field] = prev + (next - prev) * t
        } else if (prevIdx >= 0) {
          result[i][field] = result[prevIdx][field]
        } else if (nextIdx < result.length) {
          result[i][field] = result[nextIdx][field]
        }
      } else {
        streak = 0
      }
    }
    consecutiveMissingMax = Math.max(consecutiveMissingMax, streakMax)
  }

  return { frames: result as T[], consecutiveMissingMax }
}
