export interface SubjectInfo {
  subjectId: string
  name?: string
  age?: number
  sex?: 'M' | 'F' | 'OTHER'
  heightCm?: number
  weightKg?: number
  note?: string
}

export function validateSubjectInfo(s: Partial<SubjectInfo>): s is SubjectInfo {
  return typeof s.subjectId === 'string' && s.subjectId.trim().length > 0
}
