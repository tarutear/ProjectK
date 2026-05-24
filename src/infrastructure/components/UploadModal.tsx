import { useState, useRef, useCallback } from 'react'
import type { SubjectInfo } from '../../domain/models/SubjectInfo'
import type { TestInfo, FileType, Side } from '../../domain/models/TestInfo'
import { inferFileType } from '../../domain/models/TestInfo'
import { validateSubjectInfo } from '../../domain/models/SubjectInfo'
import { useSubjectStore } from '../store/SubjectStore'
import { useSessionStore } from '../store/SessionStore'
import { readFileAsText } from '../parsers/PapaParseWrapper'

type Step = 'file' | 'subject' | 'test'

interface Props {
  onClose: () => void
}

export function UploadModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>('file')
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<FileType>('PATH')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { getSubject, upsertSubject } = useSubjectStore()
  const { addSession, selectSession } = useSessionStore()

  const [subject, setSubject] = useState<Partial<SubjectInfo>>({ subjectId: '' })
  const [testInfo, setTestInfo] = useState<Partial<TestInfo>>({
    testId: '',
    side: 'LEFT',
    measuredAt: new Date(),
  })

  const handleFile = useCallback((f: File) => {
    setFile(f)
    const inferred = inferFileType(f.name)
    setFileType(inferred ?? 'PATH')
    setError(null)
    setStep('subject')
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile],
  )

  const onSubjectIdChange = (id: string) => {
    const existing = getSubject(id)
    setSubject(existing ?? { subjectId: id })
  }

  const handleSubmit = async () => {
    if (!file || !validateSubjectInfo(subject) || !testInfo.testId || !testInfo.side) return
    setIsSubmitting(true)
    try {
      const rawText = await readFileAsText(file)
      const fullTestInfo: TestInfo = {
        testId: testInfo.testId!,
        side: testInfo.side as Side,
        fileType,
        measuredAt: testInfo.measuredAt ?? new Date(),
        note: testInfo.note,
      }
      upsertSubject(subject as SubjectInfo)
      const session = addSession(rawText, subject as SubjectInfo, fullTestInfo)
      selectSession(session.id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '파싱 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            {(['file', 'subject', 'test'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-6 h-px bg-gray-200" />}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs ${step === s ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {s === 'file' ? '파일' : s === 'subject' ? '대상자' : '검사정보'}
                </span>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-6">
          {/* Step 1: File */}
          {step === 'file' && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-4">CSV 파일 선택</h2>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-4xl mb-3">📁</div>
                <p className="text-sm text-gray-600 font-medium">파일을 드래그하거나 클릭하여 선택</p>
                <p className="text-xs text-gray-400 mt-1">path_*.csv / angle_*.csv</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
          )}

          {/* Step 2: Subject */}
          {step === 'subject' && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">대상자 정보</h2>
              <p className="text-xs text-gray-400 mb-4">파일: <span className="font-medium">{file?.name}</span></p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">대상자 ID <span className="text-red-500">*</span></label>
                  <input
                    autoFocus
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={subject.subjectId ?? ''}
                    onChange={e => onSubjectIdChange(e.target.value)}
                    placeholder="예: PT001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700">이름(이니셜)</label>
                    <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={subject.name ?? ''} onChange={e => setSubject(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">나이</label>
                    <input type="number" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={subject.age ?? ''} onChange={e => setSubject(p => ({ ...p, age: Number(e.target.value) || undefined }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">키 (cm)</label>
                    <input type="number" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={subject.heightCm ?? ''} onChange={e => setSubject(p => ({ ...p, heightCm: Number(e.target.value) || undefined }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">몸무게 (kg)</label>
                    <input type="number" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={subject.weightKg ?? ''} onChange={e => setSubject(p => ({ ...p, weightKg: Number(e.target.value) || undefined }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">성별</label>
                  <div className="flex gap-2 mt-1">
                    {(['M', 'F', 'OTHER'] as const).map(s => (
                      <button key={s} onClick={() => setSubject(p => ({ ...p, sex: s }))}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                          subject.sex === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}>
                        {s === 'M' ? '남' : s === 'F' ? '여' : '기타'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Test Info */}
          {step === 'test' && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-4">검사 정보</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">검사 ID <span className="text-red-500">*</span></label>
                  <input autoFocus className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={testInfo.testId ?? ''} onChange={e => setTestInfo(p => ({ ...p, testId: e.target.value }))}
                    placeholder="예: WALK_001" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">검사 측 <span className="text-red-500">*</span></label>
                  <div className="flex gap-3 mt-1">
                    {(['LEFT', 'RIGHT'] as const).map(s => (
                      <button key={s} onClick={() => setTestInfo(p => ({ ...p, side: s }))}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${
                          testInfo.side === s
                            ? s === 'LEFT' ? 'bg-blue-600 text-white border-blue-600' : 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}>
                        {s === 'LEFT' ? '좌측 (L)' : '우측 (R)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">파일 타입</label>
                  <div className="flex gap-2 mt-1">
                    {(['PATH', 'ANGLE'] as const).map(t => (
                      <button key={t} onClick={() => setFileType(t)}
                        className={`px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          fileType === t ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">비고</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={testInfo.note ?? ''} onChange={e => setTestInfo(p => ({ ...p, note: e.target.value }))}
                    placeholder="선택 입력" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t flex justify-between">
          <button
            onClick={() => {
              if (step === 'subject') setStep('file')
              else if (step === 'test') setStep('subject')
              else onClose()
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {step === 'file' ? '취소' : '← 이전'}
          </button>
          {step === 'file' ? null : step === 'subject' ? (
            <button
              disabled={!subject.subjectId?.trim()}
              onClick={() => setStep('test')}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-lg"
            >
              다음 →
            </button>
          ) : (
            <button
              disabled={!testInfo.testId?.trim() || !testInfo.side || isSubmitting}
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-lg"
            >
              {isSubmitting ? '처리 중...' : '등록'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
