import { useMemo } from 'react'
import type { MarkerSession, PathFrame, AngleFrame } from '../../domain/models/MarkerSession'
import { analyzeSingle } from '../../usecases/AnalyzeSingle'
import { analyzeAsymmetry } from '../../usecases/AnalyzeAsymmetry'
import { toTrajectoryData } from '../../adapters/presenters/TrajectoryPresenter'
import { TrajectoryChart, ProfileChart } from './TrajectoryChart'
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

  const angularVelocityData = useMemo(() => {
    if (session.test.fileType !== 'ANGLE') return []
    const frames = session.frames as AngleFrame[]
    return calcAngularVelocity(frames).map((v, i) => ({
      timeMs: frames[i + 1].timeMs,
      value: v,
    }))
  }, [session])

  const sideLabel = session.test.side === 'LEFT' ? '좌측 (L)' : '우측 (R)'

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {session.subject.subjectId} — {session.test.testId}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {sideLabel} · {session.test.fileType} · {session.frames.length}프레임
            {pairedSession && ' · 쌍 분석 활성'}
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          session.test.side === 'LEFT' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
        }`}>
          {sideLabel}
        </span>
      </div>

      {/* Trajectory */}
      <Section title="궤적 (Trajectory)">
        <TrajectoryChart data={trajectoryData} fileType={session.test.fileType} />
      </Section>

      {/* Speed / Angle profile */}
      {session.test.fileType === 'PATH' && speedData.length > 0 && (
        <Section title="속도 프로파일">
          <ProfileChart data={speedData} label="속도" unit="cm/s" color="#3b82f6" />
        </Section>
      )}
      {session.test.fileType === 'ANGLE' && angularVelocityData.length > 0 && (
        <Section title="각속도 프로파일">
          <ProfileChart data={angularVelocityData} label="각속도" unit="°/s" color="#8b5cf6" />
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
