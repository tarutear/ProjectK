import type { MarkerSession } from '../../domain/models/MarkerSession'
import { useSessionStore } from '../store/SessionStore'

interface Props {
  sessions: MarkerSession[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAddOpposite: () => void
}

function groupBySubject(sessions: MarkerSession[]): Record<string, MarkerSession[]> {
  return sessions.reduce<Record<string, MarkerSession[]>>((acc, s) => {
    const key = s.subject.subjectId
    acc[key] = [...(acc[key] ?? []), s]
    return acc
  }, {})
}

function PairingBadge({ paired }: { paired: boolean }) {
  return paired ? (
    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">쌍완성</span>
  ) : (
    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">단독</span>
  )
}

export function SessionList({ sessions, selectedId, onSelect, onAddOpposite }: Props) {
  const { removeSession } = useSessionStore()
  const grouped = groupBySubject(sessions)

  if (sessions.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-400 mt-8">
        <p>업로드된 세션이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-4">
      {Object.entries(grouped).map(([subjectId, group]) => (
        <div key={subjectId}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1">
            {subjectId}
          </p>
          <div className="space-y-1">
            {group.map(session => {
              const isPaired = !!session.pairedSessionId
              const isSelected = session.id === selectedId
              return (
                <div
                  key={session.id}
                  className={`rounded-lg p-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                  onClick={() => onSelect(session.id)}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {session.test.testId}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        session.test.side === 'LEFT'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {session.test.side === 'LEFT' ? 'L' : 'R'}
                      </span>
                      <button
                        className="text-gray-300 hover:text-gray-500 text-xs px-1"
                        onClick={e => { e.stopPropagation(); removeSession(session.id) }}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{session.test.fileType}</span>
                    <PairingBadge paired={isPaired} />
                  </div>
                  {!isPaired && isSelected && (
                    <button
                      onClick={e => { e.stopPropagation(); onAddOpposite() }}
                      className="mt-2 w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + 반대측 파일 추가
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
