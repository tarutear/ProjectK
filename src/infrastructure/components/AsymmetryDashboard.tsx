import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { AsymmetryAnalysis } from '../../usecases/AnalyzeAsymmetry'
import { toAsymmetryChartData } from '../../adapters/presenters/AsymmetryPresenter'

interface Props {
  analysis: AsymmetryAnalysis
}

export function AsymmetryDashboard({ analysis }: Props) {
  const [threshold, setThreshold] = useState(analysis.thresholdPct)
  const chartData = toAsymmetryChartData(analysis.asymmetry, threshold)
  const exceeds = analysis.asymmetry.ai > threshold

  return (
    <div className="space-y-4">
      {/* AI summary */}
      <div className={`rounded-xl border-2 p-4 ${exceeds ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">비대칭 지수 (AI)</p>
            <p className={`text-3xl font-bold mt-1 ${exceeds ? 'text-red-600' : 'text-green-600'}`}>
              {analysis.asymmetry.ai.toFixed(1)}%
            </p>
            <p className={`text-xs mt-1 ${exceeds ? 'text-red-500' : 'text-green-600'}`}>
              {exceeds ? `⚠ 임계값 ${threshold}% 초과` : `✓ 임계값 ${threshold}% 이내`}
            </p>
          </div>
          <div className="text-right text-xs text-gray-500 space-y-1">
            <p>최대 편차: <span className="font-semibold text-gray-700">{analysis.asymmetry.maxAsymmetry.toFixed(3)} cm</span></p>
            <p>평균 편차: <span className="font-semibold text-gray-700">{analysis.asymmetry.meanAsymmetry.toFixed(3)} cm</span></p>
          </div>
        </div>
      </div>

      {/* threshold slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-24">임계값 설정</span>
        <input
          type="range" min={0} max={50} value={threshold}
          onChange={e => setThreshold(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs font-medium text-gray-700 w-10 text-right">{threshold}%</span>
      </div>

      {/* timeline chart */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">프레임별 좌우 편차</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="frameIndex" tick={{ fontSize: 11 }} label={{ value: '프레임', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={48} unit="cm" />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${Number(v).toFixed(3)} cm`, '편차']}
              contentStyle={{ fontSize: 12 }}
            />
            <ReferenceLine
              y={analysis.asymmetry.meanAsymmetry * (threshold / 10)}
              stroke="#f97316"
              strokeDasharray="5 3"
              label={{ value: `임계값`, position: 'insideTopRight', fontSize: 10, fill: '#f97316' }}
            />
            <Line
              type="monotone" dataKey="delta" stroke="#8b5cf6" strokeWidth={1.5} dot={false}
              name="편차"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
