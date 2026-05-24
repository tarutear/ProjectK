import type { MappingConfig } from '../domain/models/MappingConfig'
import type { FileType } from '../domain/models/TestInfo'

const STORAGE_KEY = 'marker_mapping_config'

export function saveMapping(config: MappingConfig): void {
  try {
    const all = loadAllMappings()
    all[config.fileType] = config
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // LocalStorage not available (e.g. test env)
  }
}

export function loadMapping(fileType: FileType): MappingConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const all = JSON.parse(raw) as Record<FileType, MappingConfig>
    return all[fileType] ?? null
  } catch {
    return null
  }
}

function loadAllMappings(): Partial<Record<FileType, MappingConfig>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
