import type { MarkerSession } from '../domain/models/MarkerSession'

function pairKey(s: MarkerSession): string {
  return `${s.subject.subjectId}|${s.test.testId}|${s.test.fileType}`
}

export function findPairedSession(
  sessions: MarkerSession[],
  target: MarkerSession,
): MarkerSession | undefined {
  const key = pairKey(target)
  return sessions.find(
    s => s.id !== target.id && pairKey(s) === key && s.test.side !== target.test.side,
  )
}

export function applyPairing(sessions: MarkerSession[]): MarkerSession[] {
  return sessions.map(session => {
    const pair = findPairedSession(sessions, session)
    return { ...session, pairedSessionId: pair?.id }
  })
}
