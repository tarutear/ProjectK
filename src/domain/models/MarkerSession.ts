import type { SubjectInfo } from './SubjectInfo'
import type { TestInfo } from './TestInfo'

export interface CsvMetadata {
  distance?: number
  angle?: number
  length?: number
  totalPoints?: number
  startCoord?: [number, number]
  endCoord?: [number, number]
  startTime?: string
  endTime?: string
  raw: Record<string, string>
}

export interface PathFrame {
  index: number
  timeMs: number
  x: number
  y: number
}

export interface AngleFrame {
  index: number
  timeMs: number
  pivotX: number
  pivotY: number
  endX: number
  endY: number
  angleDeg: number
}

export interface ParseWarning {
  type: 'TOTAL_POINTS_MISMATCH' | 'CONSECUTIVE_MISSING' | 'PARSE_ERROR'
  message: string
}

export interface MarkerSession {
  id: string
  subject: SubjectInfo
  test: TestInfo
  metadata: CsvMetadata
  frames: PathFrame[] | AngleFrame[]
  warnings: ParseWarning[]
  pairedSessionId?: string
}
