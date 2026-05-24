import { useState, useRef, useCallback, useMemo } from 'react'
import type { FileType, Side } from '../../domain/models/TestInfo'
import { inferFileType } from '../../domain/models/TestInfo'
import { useSubjectStore } from '../store/SubjectStore'
import { useSessionStore } from '../store/SessionStore'
import { readFileAsText } from '../parsers/PapaParseWrapper'

interface FileEntry {
  id: string
  file: File
  fileType: FileType
  subjectId: string
  testId: string
  side: Side
  note: string
  status: 'pending' | 'processing' | 'done' | 'error'
  errorMsg?: string
}

function inferSide(filename: string): Side {
  const lower = filename.toLowerCase()
  if (lower.includes('_r_') || lower.includes('_right') || lower.endsWith('_r.csv') || lower.includes('right')) return 'RIGHT'
  return 'LEFT'
}

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

interface Props {
  onClose: () => void
}

export function BulkUploadModal({ onClose }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const [globalSubjectId, setGlobalSubjectId] = useState('')
  const [globalTestId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upsertSubject } = useSubjectStore()
  const { addSession, selectSession } = useSessionStore()

  const addFiles = useCallback((files: File[]) => {
    const csvFiles = files.filter(f => f.name.endsWith('.csv'))
    setEntries(prev => {
      const newEntries: FileEntry[] = csvFiles.map(file => ({
        id: makeId(),
        file,
        fileType: inferFileType(file.name) ?? 'PATH',
        subjectId: globalSubjectId,
        testId: globalTestId || file.name.replace(/\.(csv)$/i, '').replace(/^(path|angle)_/i, ''),
        side: inferSide(file.name),
        note: '',
        status: 'pending',
      }))
      return [...prev, ...newEntries]
    })
  }, [globalSubjectId, globalTestId])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const updateEntry = useCallback((id: string, patch: Partial<FileEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }, [])

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const applyGlobalSubjectId = () => {
    if (!globalSubjectId.trim()) return
    setEntries(prev => prev.map(e => ({ ...e, subjectId: globalSubjectId })))
  }

  // auto-pair preview: group by subjectId+testId+fileType, detect L+R pairs
  const pairMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const e of entries) {
      const key = `${e.subjectId}|${e.testId}|${e.fileType}`
      const arr = map.get(key) ?? []
      arr.push(e.id)
      map.set(key, arr)
    }
    // return Set of ids that are in a valid pair
    const paired = new Set<string>()
    for (const ids of map.values()) {
      if (ids.length === 2) {
        const [a, b] = ids.map(id => entries.find(e => e.id === id)!)
        if (a && b && a.side !== b.side) {
          paired.add(a.id)
          paired.add(b.id)
        }
      }
    }
    return paired
  }, [entries])

  const canSubmit = entries.length > 0
    && entries.every(e => e.subjectId.trim() && e.testId.trim())
    && !submitting

  const handleSubmit = async () => {
    setSubmitting(true)
    let lastId: string | null = null

    for (const entry of entries) {
      if (entry.status === 'done') continue
      updateEntry(entry.id, { status: 'processing' })
      try {
        const rawText = await readFileAsText(entry.file)
        upsertSubject({ subjectId: entry.subjectId })
        const session = addSession(rawText, { subjectId: entry.subjectId }, {
          testId: entry.testId,
          side: entry.side,
          fileType: entry.fileType,
          measuredAt: new Date(),
          note: entry.note || undefined,
        })
        updateEntry(entry.id, { status: 'done' })
        lastId = session.id
      } catch (err) {
        updateEntry(entry.id, { status: 'error', errorMsg: err instanceof Error ? err.message : '오류' })
      }
    }

    setSubmitting(false)
    if (lastId) selectSession(lastId)
    if (entries.every(e => e.status === 'done' || e.status === 'error')) {
      setTimeout(onClose, 600)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">CSV 파일 업로드</h2>
            <p className="text-xs text-gray-400 mt-0.5">여러 파일을 한 번에 등록할 수 있습니다</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-3xl mb-2">📂</div>
            <p className="text-sm font-medium text-gray-600">CSV 파일을 여기에 드래그하거나 클릭</p>
            <p className="text-xs text-gray-400 mt-1">path_*.csv / angle_*.csv · 여러 파일 동시 선택 가능</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = '' }}
          />

          {/* Global fill */}
          {entries.length > 0 && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500">대상자 ID 일괄 적용</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={globalSubjectId}
                  onChange={e => setGlobalSubjectId(e.target.value)}
                  placeholder="예: PT001"
                />
              </div>
              <button
                onClick={applyGlobalSubjectId}
                disabled={!globalSubjectId.trim()}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg font-medium text-gray-700"
              >
                전체 적용
              </button>
            </div>
          )}

          {/* File list */}
          {entries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {entries.length}개 파일
                {pairMap.size > 0 && (
                  <span className="ml-2 text-green-600 normal-case font-normal">
                    • {pairMap.size / 2}쌍 자동 매칭됨
                  </span>
                )}
              </p>
              {entries.map(entry => (
                <FileRow
                  key={entry.id}
                  entry={entry}
                  isPaired={pairMap.has(entry.id)}
                  onChange={patch => updateEntry(entry.id, patch)}
                  onRemove={() => removeEntry(entry.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex justify-between items-center">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">취소</button>
          <div className="flex items-center gap-3">
            {entries.length > 0 && (
              <span className="text-xs text-gray-400">
                {entries.filter(e => e.status === 'done').length}/{entries.length} 완료
              </span>
            )}
            <button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-lg"
            >
              {submitting ? '등록 중...' : `${entries.length}개 등록`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FileRowProps {
  entry: FileEntry
  isPaired: boolean
  onChange: (patch: Partial<FileEntry>) => void
  onRemove: () => void
}

function FileRow({ entry, isPaired, onChange, onRemove }: FileRowProps) {
  const statusColor = {
    pending: 'text-gray-400',
    processing: 'text-blue-500 animate-pulse',
    done: 'text-green-500',
    error: 'text-red-500',
  }[entry.status]

  const statusIcon = {
    pending: '○',
    processing: '◌',
    done: '✓',
    error: '✗',
  }[entry.status]

  return (
    <div className={`rounded-xl border px-4 py-3 ${
      entry.status === 'error' ? 'border-red-200 bg-red-50' :
      isPaired ? 'border-green-200 bg-green-50' :
      'border-gray-200 bg-white'
    }`}>
      {/* Row 1: filename + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-sm font-bold ${statusColor}`}>{statusIcon}</span>
          <span className="text-xs font-medium text-gray-700 truncate">{entry.file.name}</span>
          {isPaired && <span className="text-xs bg-green-100 text-green-700 px-1.5 rounded-full shrink-0">쌍</span>}
        </div>
        {entry.status === 'pending' && (
          <button onClick={onRemove} className="text-gray-300 hover:text-gray-500 text-xs shrink-0">✕</button>
        )}
      </div>
      {entry.errorMsg && <p className="text-xs text-red-600 mt-1">{entry.errorMsg}</p>}

      {/* Row 2: editable fields */}
      {entry.status !== 'done' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={entry.subjectId}
            onChange={e => onChange({ subjectId: e.target.value })}
            placeholder="대상자 ID *"
          />
          <input
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={entry.testId}
            onChange={e => onChange({ testId: e.target.value })}
            placeholder="검사 ID *"
          />
          <div className="flex gap-1">
            {(['LEFT', 'RIGHT'] as Side[]).map(s => (
              <button key={s} onClick={() => onChange({ side: s })}
                className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  entry.side === s
                    ? s === 'LEFT' ? 'bg-blue-600 text-white border-blue-600' : 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}>
                {s === 'LEFT' ? 'L' : 'R'}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['PATH', 'ANGLE'] as FileType[]).map(t => (
              <button key={t} onClick={() => onChange({ fileType: t })}
                className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  entry.fileType === t ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
