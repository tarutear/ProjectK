import { useState } from 'react'
import { UploadModal } from './infrastructure/components/UploadModal'
import { SessionList } from './infrastructure/components/SessionList'
import { AnalysisView } from './infrastructure/components/AnalysisView'
import { useSessionStore } from './infrastructure/store/SessionStore'

export default function App() {
  const [showUpload, setShowUpload] = useState(false)
  const { sessions, selectedSessionId, selectSession, getSession, getPair } = useSessionStore()
  const selectedSession = selectedSessionId ? getSession(selectedSessionId) : null
  const pairedSession = selectedSession ? getPair(selectedSession) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">마커 추적 분석</h1>
          <p className="text-sm text-gray-500">좌우 비대칭 분석 도구</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + 파일 업로드
        </button>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        <aside className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
          <SessionList
            sessions={sessions}
            selectedId={selectedSessionId}
            onSelect={selectSession}
            onAddOpposite={() => setShowUpload(true)}
          />
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {selectedSession ? (
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
        </main>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  )
}
