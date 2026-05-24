import { lazy, Suspense, useState } from 'react'
import { SessionList } from './infrastructure/components/SessionList'
import { useSessionStore } from './infrastructure/store/SessionStore'
import { exportAllJson } from './usecases/ExportData'

const BulkUploadModal = lazy(() =>
  import('./infrastructure/components/BulkUploadModal').then(m => ({ default: m.BulkUploadModal }))
)
const AnalysisView = lazy(() =>
  import('./infrastructure/components/AnalysisView').then(m => ({ default: m.AnalysisView }))
)
const TrendView = lazy(() =>
  import('./infrastructure/components/TrendView').then(m => ({ default: m.TrendView }))
)

function Spinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

type ViewMode = 'analysis' | 'trend'

export default function App() {
  const [showUpload, setShowUpload] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('analysis')
  const { sessions, selectedSessionId, selectSession, getSession, getPair } = useSessionStore()
  const selectedSession = selectedSessionId ? getSession(selectedSessionId) : null
  const pairedSession = selectedSession ? getPair(selectedSession) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">마커 추적 분석</h1>
          <p className="text-xs text-gray-400">좌우 비대칭 분석 도구</p>
        </div>
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <button
              onClick={() => exportAllJson(sessions)}
              className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              JSON 전체 저장
            </button>
          )}
          <button
            onClick={() => setShowUpload(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            + 파일 업로드
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        <aside className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
          <SessionList
            sessions={sessions}
            selectedId={selectedSessionId}
            onSelect={(id) => { selectSession(id); setViewMode('analysis') }}
            onAddOpposite={() => setShowUpload(true)}
          />
        </aside>

        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* View mode tabs — only when sessions exist */}
          {sessions.length > 0 && (
            <div className="border-b border-gray-200 bg-white px-6 flex gap-4 shrink-0">
              <button
                onClick={() => setViewMode('analysis')}
                className={`text-sm py-3 font-medium border-b-2 transition-colors ${
                  viewMode === 'analysis'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                세션 분석
              </button>
              <button
                onClick={() => setViewMode('trend')}
                className={`text-sm py-3 font-medium border-b-2 transition-colors ${
                  viewMode === 'trend'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                추이 비교
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6">
            <Suspense fallback={<Spinner />}>
              {viewMode === 'trend' ? (
                <TrendView sessions={sessions} />
              ) : selectedSession ? (
                <AnalysisView session={selectedSession} pairedSession={pairedSession ?? undefined} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <h2 className="text-lg font-medium text-gray-700 mb-2">분석할 파일을 선택하세요</h2>
                  <p className="text-sm text-gray-400 mb-6">
                    CSV 파일을 업로드하거나 왼쪽 목록에서 세션을 선택하세요
                  </p>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
                  >
                    파일 업로드
                  </button>
                </div>
              )}
            </Suspense>
          </div>
        </main>
      </div>

      {showUpload && (
        <Suspense fallback={null}>
          <BulkUploadModal onClose={() => setShowUpload(false)} />
        </Suspense>
      )}
    </div>
  )
}
