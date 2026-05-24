export type FileType = 'PATH' | 'ANGLE'
export type Side = 'LEFT' | 'RIGHT'

export interface TestInfo {
  testId: string
  side: Side
  fileType: FileType
  measuredAt: Date
  note?: string
}

export function inferFileType(filename: string): FileType | null {
  if (filename.startsWith('path_')) return 'PATH'
  if (filename.startsWith('angle_')) return 'ANGLE'
  return null
}
