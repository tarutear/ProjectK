import type { MarkerSession, PathFrame, AngleFrame } from '../../domain/models/MarkerSession'

export interface TrajectoryPoint { x: number; y: number; timeMs: number }
export interface TrajectoryData {
  left?: TrajectoryPoint[]
  right?: TrajectoryPoint[]
  pivotLeft?: TrajectoryPoint[]
  pivotRight?: TrajectoryPoint[]
  endLeft?: TrajectoryPoint[]
  endRight?: TrajectoryPoint[]
}

export function toTrajectoryData(session: MarkerSession, paired?: MarkerSession): TrajectoryData {
  const toPoints = (frames: PathFrame[]): TrajectoryPoint[] =>
    frames.map(f => ({ x: f.x, y: f.y, timeMs: f.timeMs }))

  const toPivotPoints = (frames: AngleFrame[]): TrajectoryPoint[] =>
    frames.map(f => ({ x: f.pivotX, y: f.pivotY, timeMs: f.timeMs }))

  const toEndPoints = (frames: AngleFrame[]): TrajectoryPoint[] =>
    frames.map(f => ({ x: f.endX, y: f.endY, timeMs: f.timeMs }))

  const isPath = session.test.fileType === 'PATH'
  const isLeft = session.test.side === 'LEFT'

  if (isPath) {
    const pts = toPoints(session.frames as PathFrame[])
    const pairPts = paired ? toPoints(paired.frames as PathFrame[]) : undefined
    return {
      left: isLeft ? pts : pairPts,
      right: isLeft ? pairPts : pts,
    }
  } else {
    const frames = session.frames as AngleFrame[]
    const pairFrames = paired ? (paired.frames as AngleFrame[]) : undefined
    const pivot = toPivotPoints(frames)
    const end = toEndPoints(frames)
    const pairPivot = pairFrames ? toPivotPoints(pairFrames) : undefined
    const pairEnd = pairFrames ? toEndPoints(pairFrames) : undefined
    return {
      pivotLeft: isLeft ? pivot : pairPivot,
      pivotRight: isLeft ? pairPivot : pivot,
      endLeft: isLeft ? end : pairEnd,
      endRight: isLeft ? pairEnd : end,
    }
  }
}
