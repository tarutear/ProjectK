import { useMemo, useState, useRef, useEffect } from 'react'
import type { MarkerSession, PathFrame, AngleFrame } from '../../domain/models/MarkerSession'
import { analyzeSingle } from '../../usecases/AnalyzeSingle'
import { analyzeAsymmetry } from '../../usecases/AnalyzeAsymmetry'
import { exportSummaryCsv, exportFramesCsv } from '../../usecases/ExportData'
import { toTrajectoryData } from '../../adapters/presenters/TrajectoryPresenter'
import { TrajectoryChart, ProfileChart, DualProfileChart } from './TrajectoryChart'
import { AsymmetryDashboard } from './AsymmetryDashboard'
import { SummaryCard } from './SummaryCard'
import { calcSpeedProfile } from '../../domain/metrics/PathMetrics'
import { calcAngularVelocity } from '../../domain/metrics/AngleMetrics'

interface Props {
  session: MarkerSession
  pairedSession?: MarkerSession
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function ExportMenu({ session, paired }: { session: MarkerSession; paired?: MarkerSession }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
      >
        내보내기 ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1">
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => { exportSummaryCsv(session, paired); setOpen(false) }}
          >
            요약 CSV 저장
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => { exportFramesCsv(session); setOpen(false) }}
          >
            프레임 데이터 CSV
          </button>
          {paired && (
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => { exportFramesCsv(paired); setOpen(false) }}
            >
              상대 측 프레임 CSV
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function AnalysisView({ session, pairedSession }: Props) {
  const analysis = useMemo(() => analyzeSingle(session), [session])
  const pairedAnalysis = useMemo(
    () => (pairedSession ? analyzeSingle(pairedSession) : undefined),
    [pairedSession],
  )
  const asymmetryAnalysis = useMemo(
    () => (pairedSession ? analyzeAsymmetry(
      session.test.side === 'LEFT' ? session : pairedSession,
      session.test.side === 'RIGHT' ? session : pairedSession,
    ) : undefined),
    [session, pairedSession],
  )
  const trajectoryData = useMemo(
    () => toTrajectoryData(session, pairedSession),
    [session, pairedSession],
  )

  const speedData = useMemo(() => {
    if (session.test.fileType !== 'PATH') return []
    const frames = session.frames as PathFrame[]
    return calcSpeedProfile(frames).map((v, i) => ({
      timeMs: frames[i + 1].timeMs,
      value: v,
    }))
  }, [session])

  const pairedSpeedData = useMemo(() => {
    if (!pairedSession || pairedSession.test.fileType !== 'PATH') return []
    const frames = pairedSession.frames as PathFrame[]
    return calcSpeedProfile(frames).map((v, i) => ({
      timeMs: frames[i + 1].timeMs,
      value: v,
    }))
  }, [pairedSession])

  const angularVelocityData = useMemo(() => {
    if (session.test.fileType !== 'ANGLE') return []
    const frames = session.frames as AngleFrame[]
    return calcAngularVelocity(frames).map((v, i) => ({
      timeMs: frames[i + 1].timeMs,
      value: v,
    }))
  }, [session])

  const pairedAngularVelocityData = useMemo(() => {
    if (!pairedSession || pairedSession.test.fileType !== 'ANGLE') return []
    const frames = pairedSession.frames as AngleFrame[]
    return calcAngularVelocity(frames).map((v, i) => ({
      timeMs: frames[i + 1].timeMs,
      value: v,
    }))
  }, [pairedSession])

  const sideLabel = session.test.side === 'LEFT' ? '좌측 (L)' : '우측 (R)'

  const hasWarnings = session.warnings.length > 0 || (pairedSession?.warnings.length ?? 0) > 0

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">
            {session.subject.subjectId} — {session.test.testId}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {sideLabel} · {session.test.fileType} · {session.frames.length}프레임
            {pairedSession && ' · 쌍 분석 활성'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasWarnings && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              ⚠ 경고 있음
            </span>
          )}
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            session.test.side === 'LEFT' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
          }`}>
            {sideLabel}
          </span>
          <ExportMenu session={session} paired={pairedSession} />
        </div>
      </div>

      {/* Parse warnings */}
      {session.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-amber-700">파싱 경고</p>
          {session.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600">• {w.message}</p>
          ))}
        </div>
      )}
      {pairedSession && pairedSession.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-amber-700">파싱 경고 (상대 측)</p>
          {pairedSession.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600">• {w.message}</p>
          ))}
        </div>
      )}

      {/* Trajectory */}
      <Section title="궤적 (Trajectory)">
        <TrajectoryChart data={trajectoryData} fileType={session.test.fileType} />
      </Section>

      {/* Speed / Angle profile */}
      {session.test.fileType === 'PATH' && speedData.length > 0 && (
        <Section title={pairedSession ? '속도 프로파일 (L/R 비교)' : '속도 프로파일'}>
          {pairedSession && pairedSpeedData.length > 0 ? (
            <DualProfileChart
              leftData={session.test.side === 'LEFT' ? speedData : pairedSpeedData}
              rightData={session.test.side === 'RIGHT' ? speedData : pairedSpeedData}
              label="속도"
              unit="cm/s"
            />
          ) : (
            <ProfileChart data={speedData} label="속도" unit="cm/s" color="#3b82f6" />
          )}
        </Section>
      )}
      {session.test.fileType === 'ANGLE' && angularVelocityData.length > 0 && (
        <Section title={pairedSession ? '각속도 프로파일 (L/R 비교)' : '각속도 프로파일'}>
          {pairedSession && pairedAngularVelocityData.length > 0 ? (
            <DualProfileChart
              leftData={session.test.side === 'LEFT' ? angularVelocityData : pairedAngularVelocityData}
              rightData={session.test.side === 'RIGHT' ? angularVelocityData : pairedAngularVelocityData}
              label="각속도"
              unit="°/s"
            />
          ) : (
            <ProfileChart data={angularVelocityData} label="각속도" unit="°/s" color="#8b5cf6" />
          )}
        </Section>
      )}

      {/* Summary */}
      <Section title="분석 요약">
        <SummaryCard
          session={session}
          analysis={analysis}
          paired={pairedAnalysis && pairedSession
            ? { session: pairedSession, analysis: pairedAnalysis }
            : undefined}
        />
      </Section>

      {/* Asymmetry */}
      {asymmetryAnalysis && (
        <Section title="비대칭 분석">
          <AsymmetryDashboard analysis={asymmetryAnalysis} />
        </Section>
      )}
    </div>
  )
}
