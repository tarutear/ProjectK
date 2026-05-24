import type { MarkerSession } from '../../domain/models/MarkerSession'
import type { SingleAnalysisResult } from '../../usecases/AnalyzeSingle'

interface Props {
  session: MarkerSession
  analysis: SingleAnalysisResult
  paired?: { session: MarkerSession; analysis: SingleAnalysisResult }
}

function Stat({ label, value, unit, highlight }: { label: string; value: string; unit?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">
        {value}<span className="text-xs font-normal text-gray-500 ml-1">{unit}</span>
      </p>
    </div>
  )
}

export function SummaryCard({ session, analysis, paired }: Props) {
  const warnings = session.warnings
  const meta = session.metadata

  return (
    <div className="space-y-3">
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700 space-y-1">
          {warnings.map((w, i) => <p key={i}>⚠ {w.message}</p>)}
        </div>
      )}

      {analysis.type === 'PATH' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="총 이동 거리" value={analysis.metrics.totalDistanceCm.toFixed(2)} unit="cm" highlight />
            <Stat label="직선성 지수" value={(analysis.metrics.linearityIndex * 100).toFixed(1)} unit="%" />
            <Stat label="측정 시간" value={(analysis.metrics.durationMs / 1000).toFixed(2)} unit="s" />
            <Stat label="장비 기록 거리" value={meta.distance !== undefined ? meta.distance.toFixed(2) : '-'} unit="cm" />
          </div>
          {paired && paired.analysis.type === 'PATH' && (
            <div className="mt-2 p-3 bg-white border rounded-lg">
              <p className="text-xs font-semibold text-gray-500 mb-2">좌/우 비교</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center text-blue-600 font-medium">좌측 (L)</div>
                <div className="text-center text-gray-400">항목</div>
                <div className="text-center text-red-500 font-medium">우측 (R)</div>
                {[
                  ['총 거리', `${analysis.metrics.totalDistanceCm.toFixed(2)} cm`, `${paired.analysis.metrics.totalDistanceCm.toFixed(2)} cm`],
                  ['직선성', `${(analysis.metrics.linearityIndex * 100).toFixed(1)}%`, `${(paired.analysis.metrics.linearityIndex * 100).toFixed(1)}%`],
                ].map(([label, lVal, rVal]) => (
                  <>
                    <div key={`l-${label}`} className="text-center font-semibold text-blue-700">{lVal}</div>
                    <div key={`m-${label}`} className="text-center text-gray-400">{label}</div>
                    <div key={`r-${label}`} className="text-center font-semibold text-red-600">{rVal}</div>
                  </>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {analysis.type === 'ANGLE' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="최대 관절각" value={analysis.metrics.rom.maxDeg.toFixed(1)} unit="°" highlight />
            <Stat label="최소 관절각" value={analysis.metrics.rom.minDeg.toFixed(1)} unit="°" />
            <Stat label="가동범위 (ROM)" value={analysis.metrics.rom.romDeg.toFixed(1)} unit="°" highlight />
            <Stat label="장비 기록 각도" value={meta.angle !== undefined ? meta.angle.toFixed(1) : '-'} unit="°" />
            <Stat label="분절 길이 평균" value={analysis.metrics.segmentLengthMeanCm.toFixed(2)} unit="cm" />
            <Stat label="분절 길이 SD" value={analysis.metrics.segmentLengthSdCm.toFixed(3)} unit="cm" />
          </div>
          {paired && paired.analysis.type === 'ANGLE' && (
            <div className="mt-2 p-3 bg-white border rounded-lg">
              <p className="text-xs font-semibold text-gray-500 mb-2">좌/우 비교</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center text-blue-600 font-medium">좌측 (L)</div>
                <div className="text-center text-gray-400">항목</div>
                <div className="text-center text-red-500 font-medium">우측 (R)</div>
                {[
                  ['ROM', `${analysis.metrics.rom.romDeg.toFixed(1)}°`, `${paired.analysis.metrics.rom.romDeg.toFixed(1)}°`],
                  ['최대각', `${analysis.metrics.rom.maxDeg.toFixed(1)}°`, `${paired.analysis.metrics.rom.maxDeg.toFixed(1)}°`],
                ].map(([label, lVal, rVal]) => (
                  <>
                    <div key={`l-${label}`} className="text-center font-semibold text-blue-700">{lVal}</div>
                    <div key={`m-${label}`} className="text-center text-gray-400">{label}</div>
                    <div key={`r-${label}`} className="text-center font-semibold text-red-600">{rVal}</div>
                  </>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
