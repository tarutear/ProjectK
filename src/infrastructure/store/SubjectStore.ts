import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SubjectInfo } from '../../domain/models/SubjectInfo'

interface SubjectState {
  subjects: Record<string, SubjectInfo>
  getSubject: (id: string) => SubjectInfo | undefined
  upsertSubject: (subject: SubjectInfo) => void
  removeSubject: (id: string) => void
}

export const useSubjectStore = create<SubjectState>()(
  persist(
    (set, get) => ({
      subjects: {},

      getSubject: (id) => get().subjects[id],

      upsertSubject: (subject) =>
        set(state => ({
          subjects: { ...state.subjects, [subject.subjectId]: subject },
        })),

      removeSubject: (id) =>
        set(state => {
          const { [id]: _, ...rest } = state.subjects
          return { subjects: rest }
        }),
    }),
    { name: 'marker_subjects' },
  ),
)
