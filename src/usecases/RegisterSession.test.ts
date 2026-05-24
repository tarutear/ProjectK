import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { registerSession } from './RegisterSession'
import type { SubjectInfo } from '../domain/models/SubjectInfo'
import type { TestInfo } from '../domain/models/TestInfo'
import type { PathFrame, AngleFrame } from '../domain/models/MarkerSession'

const subject: SubjectInfo = { subjectId: 'S001', name: 'Test User' }

const pathCsv = readFileSync(resolve(__dirname, '../../tests/fixtures/path_sample.csv'), 'utf-8')
const angleCsv = readFileSync(resolve(__dirname, '../../tests/fixtures/angle_sample.csv'), 'utf-8')

describe('registerSession — PATH', () => {
  const testInfo: TestInfo = { testId: 'T1', side: 'LEFT', fileType: 'PATH', measuredAt: new Date() }

  it('returns a session with a unique id', () => {
    const s1 = registerSession(pathCsv, subject, testInfo)
    const s2 = registerSession(pathCsv, subject, testInfo)
    expect(s1.id).toBeTruthy()
    expect(s1.id).not.toBe(s2.id)
  })

  it('attaches subject and testInfo', () => {
    const session = registerSession(pathCsv, subject, testInfo)
    expect(session.subject.subjectId).toBe('S001')
    expect(session.test.fileType).toBe('PATH')
    expect(session.test.side).toBe('LEFT')
  })

  it('parses 95 frames', () => {
    const session = registerSession(pathCsv, subject, testInfo)
    expect(session.frames).toHaveLength(95)
  })

  it('frames are PathFrame type', () => {
    const session = registerSession(pathCsv, subject, testInfo)
    const f = session.frames[0] as PathFrame
    expect(typeof f.x).toBe('number')
    expect(typeof f.y).toBe('number')
  })
})

describe('registerSession — ANGLE', () => {
  const testInfo: TestInfo = { testId: 'T1', side: 'RIGHT', fileType: 'ANGLE', measuredAt: new Date() }

  it('parses 164 frames', () => {
    const session = registerSession(angleCsv, subject, testInfo)
    expect(session.frames).toHaveLength(164)
  })

  it('frames are AngleFrame type', () => {
    const session = registerSession(angleCsv, subject, testInfo)
    const f = session.frames[0] as AngleFrame
    expect(typeof f.angleDeg).toBe('number')
    expect(typeof f.pivotX).toBe('number')
  })
})
