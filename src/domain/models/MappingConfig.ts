import type { FileType } from './TestInfo'

export interface MappingConfig {
  fileType: FileType
  headerRowIndex: number
  columnMap: Record<string, string>
}
