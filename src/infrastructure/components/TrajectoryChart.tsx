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
import { useMemo } from 'react'
import type { TrajectoryData } from '../../adapters/presenters/TrajectoryPresenter'

interface Props {
  data: TrajectoryData
  fileType: 'PATH' | 'ANGLE'
  height?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cmFormatter = (v: any) => `${Number(v).toFixed(2)} cm`

export function TrajectoryChart({ data, fileType, height = 320 }: Props) {
  if (fileType === 'PATH') {
    const leftData = data.left ?? []
    const rightData = data.right ?? []
    const allX = [...leftData, ...rightData].map(p => p.x)
    const allY = [...leftData, ...rightData].map(p => p.y)
    const margin = 1
    const xDomain: [number, number] = [Math.min(...allX) - margin, Math.max(...allX) + margin]
    const yDomain: [number, number] = [Math.min(...allY) - margin, Math.max(...allY) + margin]

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" dataKey="x" domain={xDomain} tickFormatter={(v: number) => `${Number(v).toFixed(1)}cm`} tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey="y" domain={yDomain} tickFormatter={(v: number) => `${Number(v).toFixed(1)}cm`} tick={{ fontSize: 11 }} width={56} />
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
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" dataKey="x" domain={xDomain} tickFormatter={(v: number) => `${Number(v).toFixed(1)}cm`} tick={{ fontSize: 11 }} />
        <YAxis type="number" dataKey="y" domain={yDomain} tickFormatter={(v: number) => `${Number(v).toFixed(1)}cm`} tick={{ fontSize: 11 }} width={56} />
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
  height?: number
}

export function ProfileChart({ data, label, unit, color = '#3b82f6', height = 160 }: ProfileProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labelFormatter = (v: any) => `${(Number(v) / 1000).toFixed(2)}s`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valFormatter = (v: any) => [`${Number(v).toFixed(2)} ${unit}`, label]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="timeMs" tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}s`} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={48} unit={unit} />
        <Tooltip labelFormatter={labelFormatter} formatter={valFormatter} contentStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface DualProfileProps {
  leftData: { timeMs: number; value: number }[]
  rightData: { timeMs: number; value: number }[]
  label: string
  unit: string
  height?: number
}

export function DualProfileChart({ leftData, rightData, label, unit, height = 180 }: DualProfileProps) {
  const merged = useMemo(() => {
    const len = Math.max(leftData.length, rightData.length)
    return Array.from({ length: len }, (_, i) => ({
      i,
      L: leftData[i]?.value ?? null,
      R: rightData[i]?.value ?? null,
    }))
  }, [leftData, rightData])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={merged} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="i" tick={{ fontSize: 10 }} label={{ value: 'frame', position: 'insideBottomRight', offset: -4, fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} width={48} unit={unit} />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(v: unknown, name: unknown) => [
            `${Number(v).toFixed(2)} ${unit}`,
            name === 'L' ? `좌측 (L) ${label}` : `우측 (R) ${label}`,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="L" name="좌측 (L)" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls />
        <Line type="monotone" dataKey="R" name="우측 (R)" stroke="#ef4444" strokeWidth={1.5} dot={false} connectNulls strokeDasharray="5 3" />
      </LineChart>
    </ResponsiveContainer>
  )
}
