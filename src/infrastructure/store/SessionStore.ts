import { create } from 'zustand'
import type { MarkerSession } from '../../domain/models/MarkerSession'
import type { SubjectInfo } from '../../domain/models/SubjectInfo'
import type { TestInfo } from '../../domain/models/TestInfo'
import { registerSession } from '../../usecases/RegisterSession'
import { applyPairing } from '../../usecases/PairSessions'

interface SessionState {
  sessions: MarkerSession[]
  selectedSessionId: string | null
  addSession: (rawCsv: string, subject: SubjectInfo, testInfo: TestInfo) => MarkerSession
  removeSession: (id: string) => void
  clearAll: () => void
  selectSession: (id: string | null) => void
  getSession: (id: string) => MarkerSession | undefined
  getPair: (session: MarkerSession) => MarkerSession | undefined
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  selectedSessionId: null,

  addSession: (rawCsv, subject, testInfo) => {
    const newSession = registerSession(rawCsv, subject, testInfo)
    const updated = applyPairing([...get().sessions, newSession])
    set({ sessions: updated })
    return updated.find(s => s.id === newSession.id)!
  },

  clearAll: () => set({ sessions: [], selectedSessionId: null }),

  removeSession: (id) => {
    const remaining = get().sessions.filter(s => s.id !== id)
    const updated = applyPairing(remaining)
    set({
      sessions: updated,
      selectedSessionId: get().selectedSessionId === id ? null : get().selectedSessionId,
    })
  },

  selectSession: (id) => set({ selectedSessionId: id }),

  getSession: (id) => get().sessions.find(s => s.id === id),

  getPair: (session) => {
    if (!session.pairedSessionId) return undefined
    return get().sessions.find(s => s.id === session.pairedSessionId)
  },
}))
