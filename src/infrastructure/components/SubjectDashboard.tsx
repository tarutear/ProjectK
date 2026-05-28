import { useMemo, useState, useEffect } from 'react'
import type { MarkerSession, PathFrame, AngleFrame } from '../../domain/models/MarkerSession'
import { analyzeSingle } from '../../usecases/AnalyzeSingle'
import { analyzeAsymmetry } from '../../usecases/AnalyzeAsymmetry'
import { toTrajectoryData } from '../../adapters/presenters/TrajectoryPresenter'
import { TrajectoryChart, DualProfileChart } from './TrajectoryChart'
import { exportSummaryCsv } from '../../usecases/ExportData'
import { calcSpeedProfile } from '../../domain/metrics/PathMetrics'
import { calcAngularVelocity } from '../../domain/metrics/AngleMetrics'
import { useSubjectStore } from '../store/SubjectStore'

interface Props {
  subjectId: string
  sessions: MarkerSession[]
}

// Group by fileType only — L and R with different testIds still appear in the same card
interface TestGroup {
  fileType: 'PATH' | 'ANGLE'
  sessions: MarkerSession[]
}

function groupSessions(sessions: MarkerSession[]): TestGroup[] {
  const path = sessions.filter(s => s.test.fileType === 'PATH')
  const angle = sessions.filter(s => s.test.fileType === 'ANGLE')
  const result: TestGroup[] = []
  if (path.length > 0) result.push({ fileType: 'PATH', sessions: path })
  if (angle.length > 0) result.push({ fileType: 'ANGLE', sessions: angle })
  return result
}

function AIBadge({ ai }: { ai: number | null }) {
  if (ai === null) return null
  const color =
    ai < 10
      ? 'bg-green-100 text-green-700 border-green-200'
      : ai < 20
        ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
        : 'bg-red-100 text-red-700 border-red-200'
  return (
    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${color}`}>
      AI {ai.toFixed(1)}%
    </span>
  )
}

function MetricsRow({ label, left, right, unit }: { label: string; left: string; right: string; unit: string }) {
  return (
    <tr className="text-xs border-b border-gray-50 last:border-0">
      <td className="py-1.5 pr-3 text-right font-semibold text-blue-700">
        {left}
        {unit && left !== '-' && <span className="font-normal text-gray-400 ml-0.5">{unit}</span>}
      </td>
      <td className="py-1.5 px-3 text-center text-gray-500 min-w-24">{label}</td>
      <td className="py-1.5 pl-3 font-semibold text-red-600">
        {right}
        {unit && right !== '-' && <span className="font-normal text-gray-400 ml-0.5">{unit}</span>}
      </td>
    </tr>
  )
}

function fmt(n: number, d = 2) {
  return n.toFixed(d)
}
function fmtMs(ms: number) {
  return (ms / 1000).toFixed(2)
}

function SessionSelect({
  options,
  value,
  onChange,
  side,
}: {
  options: MarkerSession[]
  value: string
  onChange: (id: string) => void
  side: 'LEFT' | 'RIGHT'
}) {
  if (options.length <= 1) return null
  const color = side === 'LEFT' ? 'text-blue-700 border-blue-200' : 'text-red-600 border-red-200'
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${color}`}
    >
      {options.map(s => (
        <option key={s.id} value={s.id}>{s.test.testId}</option>
      ))}
    </select>
  )
}

function TestCard({ group }: { group: TestGroup }) {
  const dates = useMemo(() => {
    const set = new Set<string>()
    for (const s of group.sessions) {
      set.add(s.test.measuredAt.toISOString().slice(0, 10))
    }
    return Array.from(set).sort()
  }, [group.sessions])

  const [selectedDate, setSelectedDate] = useState(dates[dates.length - 1] ?? '')

  // Sessions for selected date
  const dateSessions = useMemo(
    () => group.sessions.filter(s => s.test.measuredAt.toISOString().slice(0, 10) === selectedDate),
    [group.sessions, selectedDate],
  )

  const leftOptions = useMemo(() => dateSessions.filter(s => s.test.side === 'LEFT'), [dateSessions])
  const rightOptions = useMemo(() => dateSessions.filter(s => s.test.side === 'RIGHT'), [dateSessions])

  const [selectedLeftId, setSelectedLeftId] = useState(leftOptions[0]?.id ?? '')
  const [selectedRightId, setSelectedRightId] = useState(rightOptions[0]?.id ?? '')

  // Reset L/R selection when date or sessions change
  useEffect(() => {
    if (dates.length > 0 && !dates.includes(selectedDate)) {
      setSelectedDate(dates[dates.length - 1])
    }
  }, [dates]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedLeftId(leftOptions[0]?.id ?? '')
  }, [selectedDate, leftOptions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedRightId(rightOptions[0]?.id ?? '')
  }, [selectedDate, rightOptions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const leftSession = useMemo(
    () => group.sessions.find(s => s.id === selectedLeftId),
    [group.sessions, selectedLeftId],
  )
  const rightSession = useMemo(
    () => group.sessions.find(s => s.id === selectedRightId),
    [group.sessions, selectedRightId],
  )

  const leftAnalysis = useMemo(
    () => (leftSession ? analyzeSingle(leftSession) : null),
    [leftSession],
  )
  const rightAnalysis = useMemo(
    () => (rightSession ? analyzeSingle(rightSession) : null),
    [rightSession],
  )
  const asymmetry = useMemo(
    () => (leftSession && rightSession ? analyzeAsymmetry(leftSession, rightSession) : null),
    [leftSession, rightSession],
  )

  const trajectoryData = useMemo(() => {
    if (leftSession) return toTrajectoryData(leftSession, rightSession)
    if (rightSession) return toTrajectoryData(rightSession)
    return {}
  }, [leftSession, rightSession])

  const speedLeft = useMemo(() => {
    if (!leftSession || leftSession.test.fileType !== 'PATH') return []
    const frames = leftSession.frames as PathFrame[]
    return calcSpeedProfile(frames).map((v, i) => ({ timeMs: frames[i + 1].timeMs, value: v }))
  }, [leftSession])

  const speedRight = useMemo(() => {
    if (!rightSession || rightSession.test.fileType !== 'PATH') return []
    const frames = rightSession.frames as PathFrame[]
    return calcSpeedProfile(frames).map((v, i) => ({ timeMs: frames[i + 1].timeMs, value: v }))
  }, [rightSession])

  const angVelLeft = useMemo(() => {
    if (!leftSession || leftSession.test.fileType !== 'ANGLE') return []
    const frames = leftSession.frames as AngleFrame[]
    return calcAngularVelocity(frames).map((v, i) => ({ timeMs: frames[i + 1].timeMs, value: v }))
  }, [leftSession])

  const angVelRight = useMemo(() => {
    if (!rightSession || rightSession.test.fileType !== 'ANGLE') return []
    const frames = rightSession.frames as AngleFrame[]
    return calcAngularVelocity(frames).map((v, i) => ({ timeMs: frames[i + 1].timeMs, value: v }))
  }, [rightSession])

  const ai = asymmetry?.asymmetry.ai ?? null
  const hasSession = !!(leftSession || rightSession)

  const handleExport = () => {
    if (leftSession && rightSession) exportSummaryCsv(leftSession, rightSession)
    else if (leftSession) exportSummaryCsv(leftSession)
    else if (rightSession) exportSummaryCsv(rightSession)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {group.fileType === 'PATH' ? '경로 분석' : '관절각 분석'}
          </span>
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
            {group.fileType}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {dates.length > 1 ? (
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          ) : (
            <span className="text-xs text-gray-400">{selectedDate}</span>
          )}
          <AIBadge ai={ai} />
          {hasSession && (
            <button
              onClick={handleExport}
              className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50"
            >
              CSV 저장
            </button>
          )}
        </div>
      </div>

      {/* L/R session selectors (shown when multiple options exist for the same side) */}
      {(leftOptions.length > 1 || rightOptions.length > 1) && (
        <div className="flex gap-3 bg-gray-50 rounded-lg px-3 py-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-blue-700 w-8">좌 (L)</span>
            {leftOptions.length > 0 ? (
              <SessionSelect
                options={leftOptions}
                value={selectedLeftId}
                onChange={setSelectedLeftId}
                side="LEFT"
              />
            ) : (
              <span className="text-xs text-gray-400">없음</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-red-600 w-8">우 (R)</span>
            {rightOptions.length > 0 ? (
              <SessionSelect
                options={rightOptions}
                value={selectedRightId}
                onChange={setSelectedRightId}
                side="RIGHT"
              />
            ) : (
              <span className="text-xs text-gray-400">없음</span>
            )}
          </div>
        </div>
      )}

      {/* Selected session labels */}
      {(leftSession || rightSession) && (
        <div className="flex gap-4 text-xs text-gray-400">
          {leftSession && (
            <span>
              <span className="font-semibold text-blue-600">L</span> {leftSession.test.testId}
            </span>
          )}
          {rightSession && (
            <span>
              <span className="font-semibold text-red-500">R</span> {rightSession.test.testId}
            </span>
          )}
        </div>
      )}

      {/* Missing side warnings */}
      {hasSession && !leftSession && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          ⚠ 좌측(L) 데이터 없음 — 비대칭 분석 불가
        </p>
      )}
      {hasSession && !rightSession && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          ⚠ 우측(R) 데이터 없음 — 비대칭 분석 불가
        </p>
      )}

      {/* Trajectory */}
      {hasSession && (
        <TrajectoryChart data={trajectoryData} fileType={group.fileType} height={240} />
      )}

      {/* Dual profile chart */}
      {group.fileType === 'PATH' && (speedLeft.length > 0 || speedRight.length > 0) && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">속도 프로파일 (L/R 비교)</p>
          <DualProfileChart leftData={speedLeft} rightData={speedRight} label="속도" unit="cm/s" />
        </div>
      )}
      {group.fileType === 'ANGLE' && (angVelLeft.length > 0 || angVelRight.length > 0) && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">각속도 프로파일 (L/R 비교)</p>
          <DualProfileChart leftData={angVelLeft} rightData={angVelRight} label="각속도" unit="°/s" />
        </div>
      )}

      {/* Metrics table */}
      {(leftAnalysis || rightAnalysis) && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">지표 비교</p>
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-400">
                  <th className="py-1.5 pr-3 text-right font-medium">좌측 (L)</th>
                  <th className="py-1.5 px-3 text-center font-medium">항목</th>
                  <th className="py-1.5 pl-3 text-left font-medium">우측 (R)</th>
                </tr>
              </thead>
              <tbody>
                {group.fileType === 'PATH' && (
                  <>
                    <MetricsRow
                      label="이동 거리"
                      left={leftAnalysis?.type === 'PATH' ? fmt(leftAnalysis.metrics.totalDistanceCm) : '-'}
                      right={rightAnalysis?.type === 'PATH' ? fmt(rightAnalysis.metrics.totalDistanceCm) : '-'}
                      unit="cm"
                    />
                    <MetricsRow
                      label="직선성 지수"
                      left={leftAnalysis?.type === 'PATH' ? fmt(leftAnalysis.metrics.linearityIndex * 100, 1) : '-'}
                      right={rightAnalysis?.type === 'PATH' ? fmt(rightAnalysis.metrics.linearityIndex * 100, 1) : '-'}
                      unit="%"
                    />
                    <MetricsRow
                      label="측정 시간"
                      left={leftAnalysis?.type === 'PATH' ? fmtMs(leftAnalysis.metrics.durationMs) : '-'}
                      right={rightAnalysis?.type === 'PATH' ? fmtMs(rightAnalysis.metrics.durationMs) : '-'}
                      unit="s"
                    />
                  </>
                )}
                {group.fileType === 'ANGLE' && (
                  <>
                    <MetricsRow
                      label="ROM (가동범위)"
                      left={leftAnalysis?.type === 'ANGLE' ? fmt(leftAnalysis.metrics.rom.romDeg, 1) : '-'}
                      right={rightAnalysis?.type === 'ANGLE' ? fmt(rightAnalysis.metrics.rom.romDeg, 1) : '-'}
                      unit="°"
                    />
                    <MetricsRow
                      label="최대 관절각"
                      left={leftAnalysis?.type === 'ANGLE' ? fmt(leftAnalysis.metrics.rom.maxDeg, 1) : '-'}
                      right={rightAnalysis?.type === 'ANGLE' ? fmt(rightAnalysis.metrics.rom.maxDeg, 1) : '-'}
                      unit="°"
                    />
                    <MetricsRow
                      label="최소 관절각"
                      left={leftAnalysis?.type === 'ANGLE' ? fmt(leftAnalysis.metrics.rom.minDeg, 1) : '-'}
                      right={rightAnalysis?.type === 'ANGLE' ? fmt(rightAnalysis.metrics.rom.minDeg, 1) : '-'}
                      unit="°"
                    />
                    <MetricsRow
                      label="측정 시간"
                      left={leftAnalysis?.type === 'ANGLE' ? fmtMs(leftAnalysis.metrics.durationMs) : '-'}
                      right={rightAnalysis?.type === 'ANGLE' ? fmtMs(rightAnalysis.metrics.durationMs) : '-'}
                      unit="s"
                    />
                  </>
                )}
              </tbody>
            </table>
          </div>
          {asymmetry && (
            <div className="mt-3 bg-gray-50 rounded-lg px-4 py-2.5 flex items-center gap-3">
              <span className="text-xs text-gray-500 flex-1">비대칭 지수 (AI)</span>
              <AIBadge ai={ai} />
              {ai !== null && (
                <span className={`text-xs font-medium ${ai >= 10 ? 'text-red-500' : 'text-green-600'}`}>
                  {ai >= 20 ? '⚠ 고위험' : ai >= 10 ? '⚠ 임계값 초과' : '정상 범위'}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SubjectDashboard({ subjectId, sessions }: Props) {
  const { getSubject, upsertSubject } = useSubjectStore()
  const subject = getSubject(subjectId)
  const [editNote, setEditNote] = useState(false)
  const [noteText, setNoteText] = useState(subject?.note ?? '')

  const subjectSessions = useMemo(
    () => sessions.filter(s => s.subject.subjectId === subjectId),
    [sessions, subjectId],
  )

  const groups = useMemo(() => groupSessions(subjectSessions), [subjectSessions])

  const saveNote = () => {
    upsertSubject({ subjectId, ...(subject ?? {}), note: noteText.trim() || undefined })
    setEditNote(false)
  }

  if (subjectSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
        <p className="text-sm">세션이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Subject header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{subjectId}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {subjectSessions.length}개 세션 ·{' '}
              {subjectSessions.filter(s => s.test.side === 'LEFT').length}개 좌측 ·{' '}
              {subjectSessions.filter(s => s.test.side === 'RIGHT').length}개 우측
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-1.5">메모</p>
          {editNote ? (
            <div className="flex gap-2">
              <input
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="메모를 입력하세요..."
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') saveNote()
                  if (e.key === 'Escape') setEditNote(false)
                }}
              />
              <button
                onClick={saveNote}
                className="text-xs bg-blue-600 text-white font-medium px-3 py-1.5 rounded-lg"
              >
                저장
              </button>
              <button onClick={() => setEditNote(false)} className="text-xs text-gray-400 px-2">
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setNoteText(subject?.note ?? '')
                setEditNote(true)
              }}
              className={`text-sm text-left w-full rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors ${
                subject?.note ? 'text-gray-700' : 'text-gray-400'
              }`}
            >
              {subject?.note || '+ 메모 추가'}
            </button>
          )}
        </div>
      </div>

      {/* Test cards */}
      {groups.map(group => (
        <TestCard key={group.fileType} group={group} />
      ))}
    </div>
  )
}
