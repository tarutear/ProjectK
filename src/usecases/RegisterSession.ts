import type { SubjectInfo } from '../domain/models/SubjectInfo'
import type { TestInfo } from '../domain/models/TestInfo'
import type { MarkerSession } from '../domain/models/MarkerSession'
import { parsePathCsv } from '../adapters/parsers/PathCsvParser'
import { parseAngleCsv } from '../adapters/parsers/AngleCsvParser'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function registerSession(
  rawCsvText: string,
  subject: SubjectInfo,
  testInfo: TestInfo,
): MarkerSession {
  const parseResult =
    testInfo.fileType === 'PATH'
      ? parsePathCsv(rawCsvText)
      : parseAngleCsv(rawCsvText)

  return {
    id: generateId(),
    subject,
    test: testInfo,
    metadata: parseResult.metadata,
    frames: parseResult.frames,
    warnings: parseResult.warnings,
  }
}
