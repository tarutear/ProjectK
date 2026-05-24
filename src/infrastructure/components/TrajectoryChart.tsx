import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import type { TrajectoryData } from '../../adapters/presenters/TrajectoryPresenter'

interface Props {
  data: TrajectoryData
  fileType: 'PATH' | 'ANGLE'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cmFormatter = (v: any) => `${Number(v).toFixed(2)} cm`

export function TrajectoryChart({ data, fileType }: Props) {
  if (fileType === 'PATH') {
    const leftData = data.left ?? []
    const rightData = data.right ?? []
    const allX = [...leftData, ...rightData].map(p => p.x)
    const allY = [...leftData, ...rightData].map(p => p.y)
    const margin = 1
    const xDomain: [number, number] = [Math.min(...allX) - margin, Math.max(...allX) + margin]
    const yDomain: [number, number] = [Math.min(...allY) - margin, Math.max(...allY) + margin]

    return (
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" dataKey="x" domain={xDomain} unit="cm" tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey="y" domain={yDomain} unit="cm" tick={{ fontSize: 11 }} width={48} />
          <Tooltip formatter={cmFormatter} contentStyle={{ fontSize: 12 }} />
          {leftData.length > 0 && (
            <Scatter name="좌측 (L)" data={leftData} line={{ stroke: '#3b82f6', strokeWidth: 2 }} fill="#3b82f6" r={0} />
          )}
          {rightData.length > 0 && (
            <Scatter name="우측 (R)" data={rightData} line={{ stroke: '#ef4444', strokeWidth: 2 }} fill="#ef4444" r={0} />
          )}
          <Legend />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  // ANGLE
  const leftPivot = data.pivotLeft ?? []
  const rightPivot = data.pivotRight ?? []
  const leftEnd = data.endLeft ?? []
  const rightEnd = data.endRight ?? []
  const allX = [...leftPivot, ...rightPivot, ...leftEnd, ...rightEnd].map(p => p.x)
  const allY = [...leftPivot, ...rightPivot, ...leftEnd, ...rightEnd].map(p => p.y)
  const margin = 2
  const xDomain: [number, number] = allX.length > 0
    ? [Math.min(...allX) - margin, Math.max(...allX) + margin]
    : [-25, 25]
  const yDomain: [number, number] = allY.length > 0
    ? [Math.min(...allY) - margin, Math.max(...allY) + margin]
    : [0, 35]

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" dataKey="x" domain={xDomain} unit="cm" tick={{ fontSize: 11 }} />
        <YAxis type="number" dataKey="y" domain={yDomain} unit="cm" tick={{ fontSize: 11 }} width={48} />
        <Tooltip formatter={cmFormatter} contentStyle={{ fontSize: 12 }} />
        {leftEnd.length > 0 && (
          <Scatter name="좌측 End (L)" data={leftEnd} line={{ stroke: '#3b82f6', strokeWidth: 2 }} fill="#3b82f6" r={0} />
        )}
        {rightEnd.length > 0 && (
          <Scatter name="우측 End (R)" data={rightEnd} line={{ stroke: '#ef4444', strokeWidth: 2 }} fill="#ef4444" r={0} />
        )}
        {leftPivot.length > 0 && (
          <Scatter name="좌측 Pivot (L)" data={leftPivot} line={{ stroke: '#93c5fd', strokeWidth: 1.5, strokeDasharray: '4 2' }} fill="#93c5fd" r={0} />
        )}
        {rightPivot.length > 0 && (
          <Scatter name="우측 Pivot (R)" data={rightPivot} line={{ stroke: '#fca5a5', strokeWidth: 1.5, strokeDasharray: '4 2' }} fill="#fca5a5" r={0} />
        )}
        <Legend />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

interface ProfileProps {
  data: { timeMs: number; value: number }[]
  label: string
  unit: string
  color?: string
}

export function ProfileChart({ data, label, unit, color = '#3b82f6' }: ProfileProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labelFormatter = (v: any) => `${(Number(v) / 1000).toFixed(2)}s`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valFormatter = (v: any) => [`${Number(v).toFixed(2)} ${unit}`, label]

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="timeMs"
          tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}s`}
          tick={{ fontSize: 11 }}
        />
        <YAxis tick={{ fontSize: 11 }} width={48} unit={unit} />
        <Tooltip labelFormatter={labelFormatter} formatter={valFormatter} contentStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
