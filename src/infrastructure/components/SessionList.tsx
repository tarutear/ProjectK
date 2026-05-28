import type { MarkerSession } from '../../domain/models/MarkerSession'
import { useSessionStore } from '../store/SessionStore'

interface Props {
  sessions: MarkerSession[]
  selectedId: string | null
  selectedSubjectId: string | null
  onSelect: (id: string) => void
  onSelectSubject: (subjectId: string) => void
  onAddOpposite: () => void
}

function groupBySubject(sessions: MarkerSession[]): Record<string, MarkerSession[]> {
  return sessions.reduce<Record<string, MarkerSession[]>>((acc, s) => {
    const key = s.subject.subjectId
    acc[key] = [...(acc[key] ?? []), s]
    return acc
  }, {})
}

type SessionRow =
  | { kind: 'pair'; left: MarkerSession; right: MarkerSession }
  | { kind: 'single'; session: MarkerSession }

function buildRows(group: MarkerSession[]): SessionRow[] {
  const seen = new Set<string>()
  const rows: SessionRow[] = []
  for (const s of group) {
    if (seen.has(s.id)) continue
    seen.add(s.id)
    if (s.pairedSessionId) {
      const pair = group.find(p => p.id === s.pairedSessionId)
      if (pair && !seen.has(pair.id)) {
        seen.add(pair.id)
        const left = s.test.side === 'LEFT' ? s : pair
        const right = s.test.side === 'RIGHT' ? s : pair
        rows.push({ kind: 'pair', left, right })
        continue
      }
    }
    rows.push({ kind: 'single', session: s })
  }
  return rows
}

interface PairRowProps {
  left: MarkerSession
  right: MarkerSession
  selectedId: string | null
  onSelect: (id: string) => void
  onSelectSubject: (id: string) => void
  onRemoveLeft: () => void
  onRemoveRight: () => void
}

function PairRow({ left, right, selectedId, onSelect, onSelectSubject, onRemoveLeft, onRemoveRight }: PairRowProps) {
  const isActive = left.id === selectedId || right.id === selectedId
  return (
    <div className={`rounded-lg border overflow-hidden ${isActive ? 'border-blue-300' : 'border-green-200'}`}>
      {/* Top: click → L+R comparison */}
      <button
        onClick={() => onSelectSubject(left.subject.subjectId)}
        className="w-full px-3 py-2.5 text-left hover:bg-green-50 transition-colors bg-green-50/40"
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium text-gray-800 truncate">{left.test.testId}</span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-400">{left.test.fileType}</span>
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">쌍완성</span>
          </div>
        </div>
        <p className="text-xs text-green-600 font-medium mt-0.5">L+R 비교 분석 보기 →</p>
      </button>
      {/* Bottom: individual session buttons */}
      <div className="flex border-t border-green-100 divide-x divide-green-100">
        <button
          onClick={() => onSelect(left.id)}
          className={`flex-1 py-1.5 text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
            selectedId === left.id ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-50'
          }`}
        >
          <span>L 세션</span>
        </button>
        <button
          onClick={() => onSelect(right.id)}
          className={`flex-1 py-1.5 text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
            selectedId === right.id ? 'bg-red-500 text-white' : 'text-red-600 hover:bg-red-50'
          }`}
        >
          <span>R 세션</span>
        </button>
        <button
          onClick={e => { e.stopPropagation(); if (confirm(`${left.test.testId} L+R 세션을 모두 삭제할까요?`)) { onRemoveLeft(); onRemoveRight() } }}
          className="px-2.5 py-1.5 text-gray-300 hover:text-red-400 text-xs transition-colors"
          title="L+R 삭제"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export function SessionList({ sessions, selectedId, selectedSubjectId, onSelect, onSelectSubject, onAddOpposite }: Props) {
  const { removeSession, clearAll } = useSessionStore()
  const grouped = groupBySubject(sessions)
  const pairedCount = sessions.filter(s => s.pairedSessionId).length / 2

  if (sessions.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-400 mt-8">
        <p>업로드된 세션이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-4">
      {/* summary bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-gray-400">
          {sessions.length}개 세션{pairedCount > 0 ? ` · ${pairedCount}쌍` : ''}
        </span>
        <button
          onClick={() => { if (confirm('모든 세션을 삭제할까요?')) clearAll() }}
          className="text-xs text-red-400 hover:text-red-600"
        >
          전체 삭제
        </button>
      </div>

      {Object.entries(grouped).map(([subjectId, group]) => (
        <div key={subjectId}>
          <button
            onClick={() => onSelectSubject(subjectId)}
            className={`w-full text-left text-xs font-semibold uppercase tracking-wide px-1 mb-1.5 py-0.5 rounded hover:text-blue-600 transition-colors ${
              selectedSubjectId === subjectId ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            {subjectId}
          </button>
          <div className="space-y-1.5">
            {buildRows(group).map(row => {
              if (row.kind === 'pair') {
                return (
                  <PairRow
                    key={row.left.id}
                    left={row.left}
                    right={row.right}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onSelectSubject={onSelectSubject}
                    onRemoveLeft={() => removeSession(row.left.id)}
                    onRemoveRight={() => removeSession(row.right.id)}
                  />
                )
              }
              const { session } = row
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
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">단독</span>
                  </div>
                  {isSelected && (
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
