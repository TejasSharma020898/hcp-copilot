import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import HCPProfile from './components/HCPProfile'
import CopilotPanel from './components/CopilotPanel'
import { fetchHCPs, fetchHCP } from './api/hcp'
import { AlertCircle, Loader2, Activity } from 'lucide-react'

export default function App() {
  const [hcps, setHcps]           = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [hcpDetail, setHcpDetail]  = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [listError, setListError]  = useState(null)

  // Load HCP list on mount
  useEffect(() => {
    fetchHCPs()
      .then(data => { setHcps(data); setListLoading(false) })
      .catch(e => { setListError(e.message); setListLoading(false) })
  }, [])

  // Load HCP detail when selection changes
  useEffect(() => {
    if (!selectedId) { setHcpDetail(null); return }
    setDetailLoading(true)
    fetchHCP(selectedId)
      .then(data => { setHcpDetail(data); setDetailLoading(false) })
      .catch(() => setDetailLoading(false))
  }, [selectedId])

  if (listLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-brand-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading HCP database…</p>
        </div>
      </div>
    )
  }

  if (listError) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 max-w-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle size={22} className="text-red-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Cannot connect to backend</p>
          <p className="text-xs text-slate-400">{listError}</p>
          <p className="text-xs text-slate-300">Make sure the FastAPI server is running on port 8000</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Left Sidebar — HCP List */}
      <Sidebar
        hcps={hcps}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Centre — HCP Profile */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-14 flex-shrink-0 bg-white border-b border-slate-100 flex items-center px-6 gap-3">
          <Activity size={15} className="text-brand-600" />
          <span className="text-sm font-semibold text-slate-700">HCP Engagement Copilot</span>
          <span className="text-slate-200 mx-1">·</span>
          <span className="text-xs text-slate-400">Pharmaceutical Digital Health</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">{hcps.length} HCPs loaded</span>
          </div>
        </div>

        {/* Profile area */}
        <div className="flex-1 overflow-hidden">
          {detailLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="text-brand-500 animate-spin" />
            </div>
          ) : hcpDetail ? (
            <HCPProfile hcp={hcpDetail} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Activity size={26} className="text-slate-300" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-600">Select an HCP</p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Choose a healthcare professional from the sidebar to view their profile and generate an AI recommendation.
                </p>
              </div>
              <div className="text-xs text-slate-300 mt-2">
                Or use a Demo Scenario from the bottom of the sidebar
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right — Copilot Panel */}
      <CopilotPanel
        hcpId={selectedId}
        hcpName={hcpDetail?.name}
        hcpDetail={hcpDetail}
      />
    </div>
  )
}
