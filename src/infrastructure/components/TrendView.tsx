import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { MarkerSession } from '../../domain/models/MarkerSession'
import { analyzeSingle } from '../../usecases/AnalyzeSingle'
import { analyzeAsymmetry } from '../../usecases/AnalyzeAsymmetry'

interface Props {
  sessions: MarkerSession[]
}

type PathMetricKey = 'totalDistance' | 'linearityIndex' | 'duration'
type AngleMetricKey = 'rom' | 'maxAngle' | 'minAngle'
type MetricKey = PathMetricKey | AngleMetricKey | 'ai'

interface MetricOption {
  key: MetricKey
  label: string
  unit: string
  fileType: 'PATH' | 'ANGLE' | 'BOTH'
}

const METRIC_OPTIONS: MetricOption[] = [
  { key: 'totalDistance', label: '이동 거리', unit: 'cm', fileType: 'PATH' },
  { key: 'linearityIndex', label: '직선성 지수', unit: '%', fileType: 'PATH' },
  { key: 'duration', label: '측정 시간', unit: 's', fileType: 'PATH' },
  { key: 'rom', label: 'ROM (가동범위)', unit: '°', fileType: 'ANGLE' },
  { key: 'maxAngle', label: '최대 관절각', unit: '°', fileType: 'ANGLE' },
  { key: 'minAngle', label: '최소 관절각', unit: '°', fileType: 'ANGLE' },
  { key: 'ai', label: '비대칭 지수 (AI)', unit: '%', fileType: 'BOTH' },
]

function getMetricValue(session: MarkerSession, key: MetricKey, pairSession?: MarkerSession): number | null {
  const analysis = analyzeSingle(session)
  if (key === 'ai') {
    if (!pairSession) return null
    const left = session.test.side === 'LEFT' ? session : pairSession
    const right = session.test.side === 'RIGHT' ? session : pairSession
    return analyzeAsymmetry(left, right).asymmetry.ai
  }
  if (analysis.type === 'PATH') {
    if (key === 'totalDistance') return analysis.metrics.totalDistanceCm
    if (key === 'linearityIndex') return analysis.metrics.linearityIndex * 100
    if (key === 'duration') return analysis.metrics.durationMs / 1000
  }
  if (analysis.type === 'ANGLE') {
    if (key === 'rom') return analysis.metrics.rom.romDeg
    if (key === 'maxAngle') return analysis.metrics.rom.maxDeg
    if (key === 'minAngle') return analysis.metrics.rom.minDeg
  }
  return null
}

function formatDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export function TrendView({ sessions }: Props) {
  // Collect unique subject IDs
  const subjectIds = useMemo(
    () => Array.from(new Set(sessions.map(s => s.subject.subjectId))).sort(),
    [sessions],
  )
  const [selectedSubject, setSelectedSubject] = useState<string>(subjectIds[0] ?? '')

  // Collect testId+fileType groups for selected subject
  const groups = useMemo(() => {
    const map = new Map<string, { testId: string; fileType: 'PATH' | 'ANGLE' }>()
    for (const s of sessions) {
      if (s.subject.subjectId !== selectedSubject) continue
      const key = `${s.test.testId}|${s.test.fileType}`
      map.set(key, { testId: s.test.testId, fileType: s.test.fileType })
    }
    return Array.from(map.values())
  }, [sessions, selectedSubject])

  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('')
  const activeGroupKey = selectedGroupKey || (groups[0] ? `${groups[0].testId}|${groups[0].fileType}` : '')
  const activeGroup = groups.find(g => `${g.testId}|${g.fileType}` === activeGroupKey)

  const availableMetrics = useMemo(() => {
    if (!activeGroup) return []
    return METRIC_OPTIONS.filter(m => m.fileType === activeGroup.fileType || m.fileType === 'BOTH')
  }, [activeGroup])

  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('totalDistance')
  const metric = availableMetrics.find(m => m.key === selectedMetric) ?? availableMetrics[0]

  type AiPoint = { date: number; dateLabel: string; AI: number | null }
  type LRPoint = { date: number; dateLabel: string; L?: number; R?: number }

  // Build chart data points
  const chartData = useMemo((): AiPoint[] | LRPoint[] => {
    if (!activeGroup || !metric) return []

    const groupSessions = sessions
      .filter(s =>
        s.subject.subjectId === selectedSubject &&
        s.test.testId === activeGroup.testId &&
        s.test.fileType === activeGroup.fileType,
      )
      .sort((a, b) => a.test.measuredAt.getTime() - b.test.measuredAt.getTime())

    // AI% chart: one point per L session that has a pair, plotted at L session date
    if (metric.key === 'ai') {
      return groupSessions
        .filter(s => s.test.side === 'LEFT' && s.pairedSessionId)
        .map(left => {
          const right = sessions.find(s => s.id === left.pairedSessionId)
          if (!right) return null
          const val = getMetricValue(left, 'ai', right)
          return {
            date: left.test.measuredAt.getTime(),
            dateLabel: formatDate(left.test.measuredAt),
            AI: val !== null ? +val.toFixed(2) : null,
          }
        })
        .filter(Boolean) as { date: number; dateLabel: string; AI: number | null }[]
    }

    // Regular metric: one point per session, split L/R
    const byDate = new Map<number, { dateLabel: string; L?: number; R?: number }>()
    for (const s of groupSessions) {
      const ts = s.test.measuredAt.getTime()
      const val = getMetricValue(s, metric.key)
      if (val === null) continue
      const existing = byDate.get(ts) ?? { dateLabel: formatDate(s.test.measuredAt) }
      if (s.test.side === 'LEFT') existing.L = +val.toFixed(4)
      else existing.R = +val.toFixed(4)
      byDate.set(ts, existing)
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a - b)
      .map(([date, v]) => ({ date, ...v }))
  }, [sessions, selectedSubject, activeGroup, metric])

  const isAI = metric?.key === 'ai'

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
        <div className="text-5xl mb-4">📈</div>
        <p className="text-sm font-medium text-gray-500 mb-1">추이 비교</p>
        <p className="text-xs">세션이 없습니다. 파일을 업로드하면 날짜별 변화를 확인할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-base font-semibold text-gray-900">추이 비교</h2>
        <p className="text-xs text-gray-400 mt-0.5">날짜별 측정 결과 변화를 확인합니다</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">대상자</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedSubject}
              onChange={e => { setSelectedSubject(e.target.value); setSelectedGroupKey('') }}
            >
              {subjectIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">검사 항목</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={activeGroupKey}
              onChange={e => { setSelectedGroupKey(e.target.value); setSelectedMetric('totalDistance') }}
            >
              {groups.map(g => {
                const k = `${g.testId}|${g.fileType}`
                return <option key={k} value={k}>{g.testId} ({g.fileType})</option>
              })}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">지표</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={metric?.key ?? ''}
              onChange={e => setSelectedMetric(e.target.value as MetricKey)}
            >
              {availableMetrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {chartData.length < 2 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">데이터가 부족합니다.</p>
            <p className="text-xs mt-1">같은 대상자·검사 항목으로 2회 이상 측정하면 추이를 확인할 수 있습니다.</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-gray-600 mb-4">
              {metric?.label} ({metric?.unit}) — {selectedSubject} · {activeGroup?.testId}
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData as unknown[]} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  unit={metric?.unit}
                  width={52}
                  domain={isAI ? [0, 'auto'] : ['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v: unknown) => [`${Number(v).toFixed(2)} ${metric?.unit}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {isAI ? (
                  <>
                    <Line type="monotone" dataKey="AI" name="비대칭 지수" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                    <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '임계값 10%', fontSize: 10, fill: '#ef4444', position: 'insideTopRight' }} />
                  </>
                ) : (
                  <>
                    <Line type="monotone" dataKey="L" name="좌측 (L)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                    <Line type="monotone" dataKey="R" name="우측 (R)" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} connectNulls strokeDasharray="6 3" />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Session list for context */}
      {activeGroup && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">세션 목록</p>
          <div className="space-y-1">
            {sessions
              .filter(s =>
                s.subject.subjectId === selectedSubject &&
                s.test.testId === activeGroup.testId &&
                s.test.fileType === activeGroup.fileType,
              )
              .sort((a, b) => a.test.measuredAt.getTime() - b.test.measuredAt.getTime())
              .map(s => (
                <div key={s.id} className="flex items-center gap-3 text-xs py-1">
                  <span className={`font-semibold w-6 text-center ${s.test.side === 'LEFT' ? 'text-blue-600' : 'text-red-500'}`}>
                    {s.test.side === 'LEFT' ? 'L' : 'R'}
                  </span>
                  <span className="text-gray-400">{formatDate(s.test.measuredAt)}</span>
                  <span className="text-gray-600">{s.frames.length} 프레임</span>
                  {s.pairedSessionId && <span className="text-green-600">쌍</span>}
                  {s.warnings.length > 0 && <span className="text-amber-500">⚠ {s.warnings.length}건</span>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
