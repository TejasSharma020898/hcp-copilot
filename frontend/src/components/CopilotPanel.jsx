import { useState } from 'react'
import {
  Sparkles, ShieldAlert, ShieldCheck, AlertTriangle,
  Mail, Phone, UserCheck, Video, Clock, FileText,
  ChevronDown, ChevronUp, Loader2, BookOpen, Lightbulb,
  AlertCircle, CheckCircle2, Copy, Check
} from 'lucide-react'
import { fetchRecommendation } from '../api/hcp'

const ACTION_CONFIG = {
  send_email:           { label: 'Send Email',           color: 'bg-blue-500',    light: 'bg-blue-50 text-blue-700 border-blue-200',    icon: Mail },
  schedule_call:        { label: 'Schedule Call',        color: 'bg-violet-500',  light: 'bg-violet-50 text-violet-700 border-violet-200', icon: Phone },
  arrange_f2f:          { label: 'Arrange F2F Meeting',  color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: UserCheck },
  invite_to_webinar:    { label: 'Invite to Webinar',    color: 'bg-orange-500',  light: 'bg-orange-50 text-orange-700 border-orange-200',  icon: Video },
  send_newsletter:      { label: 'Send Newsletter',      color: 'bg-cyan-500',    light: 'bg-cyan-50 text-cyan-700 border-cyan-200',    icon: BookOpen },
  wait_and_monitor:     { label: 'Wait & Monitor',       color: 'bg-amber-500',   light: 'bg-amber-50 text-amber-700 border-amber-200',  icon: Clock },
  introductory_outreach:{ label: 'Introductory Outreach',color: 'bg-teal-500',   light: 'bg-teal-50 text-teal-700 border-teal-200',    icon: Sparkles },
  no_contact:           { label: 'Do Not Contact',       color: 'bg-red-500',     light: 'bg-red-50 text-red-700 border-red-200',       icon: ShieldAlert },
}

const PRIORITY_CONFIG = {
  high:   { label: 'High Priority',   color: 'bg-red-50 text-red-600 border-red-200' },
  medium: { label: 'Med Priority',    color: 'bg-amber-50 text-amber-600 border-amber-200' },
  low:    { label: 'Low Priority',    color: 'bg-slate-50 text-slate-500 border-slate-200' },
  none:   { label: 'No Action',       color: 'bg-slate-50 text-slate-400 border-slate-200' },
}

const GUARDRAIL_CONFIG = {
  hard_block:    { icon: ShieldAlert,  label: 'Hard Block',    bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    iconColor: 'text-red-500' },
  soft_warning:  { icon: AlertTriangle,label: 'Warning',       bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  iconColor: 'text-amber-500' },
  clear:         { icon: ShieldCheck,  label: 'Rules Clear',   bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',iconColor: 'text-emerald-500' },
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse-slow">
      <div className="skeleton h-6 w-1/2" />
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-6 w-3/4" />
      <div className="skeleton h-40 w-full" />
      <div className="skeleton h-6 w-2/3" />
      <div className="skeleton h-20 w-full" />
    </div>
  )
}

function hcpEngagementSignals(rec, key) {
  if (!rec._signals) return 0
  if (key === 'clickThroughs') return rec._signals.clickThroughs || 0
  return rec._signals[key] || 0
}

export default function CopilotPanel({ hcpId, hcpName, hcpDetail }) {
  const [rec, setRec] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [draftTab, setDraftTab] = useState('draft')

  const generate = async () => {
    setLoading(true)
    setError(null)
    setRec(null)
    setShowAssumptions(false)
    try {
      const data = await fetchRecommendation(hcpId)
      // Attach signals from hcpDetail so the breakdown UI can render them
      if (hcpDetail?.engagementSignals) {
        const s = hcpDetail.engagementSignals
        const clicks = (hcpDetail.interactionHistory || []).filter(h => h.outcome?.includes('clicked')).length
        data._signals = {
          emailOpens:       s.emailOpens || 0,
          webinarAttendance: s.webinarAttendance || 0,
          portalLogins:     s.portalLogins || 0,
          clickThroughs:    clicks,
        }
      }
      setRec(data)
    } catch (e) {
      setError(e.message || 'Failed to generate recommendation.')
    } finally {
      setLoading(false)
    }
  }

  const action = rec ? (ACTION_CONFIG[rec.next_best_action] || ACTION_CONFIG.wait_and_monitor) : null
  const priority = rec ? (PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.low) : null
  const guardrail = rec ? (GUARDRAIL_CONFIG[rec.guardrail_type] || GUARDRAIL_CONFIG.clear) : null

  const ActionIcon = action?.icon
  const GuardrailIcon = guardrail?.icon

  return (
    <aside className="w-[420px] flex-shrink-0 bg-white border-l border-slate-100 flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-brand-600 flex items-center justify-center shadow-sm">
            <Sparkles size={13} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">AI Copilot</p>
            <p className="text-[10px] text-slate-400">Next-Best-Action Engine</p>
          </div>
        </div>
        {rec && (
          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Generate Button */}
        {!loading && (
          <button
            onClick={generate}
            disabled={!hcpId}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-brand-600/25 hover:shadow-xl hover:shadow-brand-600/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            <Sparkles size={16} />
            {rec ? 'Regenerate Recommendation' : 'Generate Recommendation'}
          </button>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-5">
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-brand-100 flex items-center justify-center">
                <Loader2 size={22} className="text-brand-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">Analysing HCP profile…</p>
                <p className="text-xs text-slate-400 mt-1">Running rules engine · Retrieving content · Generating recommendation</p>
              </div>
            </div>
            <Skeleton />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Request Failed</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Recommendation Output */}
        {rec && !loading && (
          <div className="space-y-4 animate-slide-up">

            {/* Guardrail Status */}
            <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${guardrail.bg} ${guardrail.border}`}>
              <GuardrailIcon size={16} className={`flex-shrink-0 mt-0.5 ${guardrail.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${guardrail.text}`}>{guardrail.label}</p>
                {rec.guardrail_triggered && (
                  <p className={`text-xs mt-1 ${guardrail.text} opacity-80`}>{rec.blocked_reason}</p>
                )}
                {rec.warnings?.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {rec.warnings.map((w, i) => (
                      <li key={i} className={`text-xs ${guardrail.text} opacity-80`}>• {w}</li>
                    ))}
                  </ul>
                )}
                {rec.guardrail_type === 'clear' && !rec.warnings?.length && (
                  <p className="text-xs text-emerald-600 mt-0.5 opacity-80">All compliance rules passed.</p>
                )}
              </div>
            </div>

            {/* NBA + Priority */}
            <div className="flex gap-3">
              {/* Next Best Action */}
              <div className={`flex-1 rounded-xl border p-3.5 ${action.light}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1.5">Next Best Action</p>
                <div className="flex items-center gap-2">
                  <ActionIcon size={18} />
                  <p className="text-sm font-bold">{action.label}</p>
                </div>
                <p className="text-xs opacity-70 mt-1.5 font-medium">{rec.timing}</p>
              </div>
              {/* Priority */}
              <div className={`w-28 rounded-xl border p-3.5 flex flex-col items-center justify-center ${priority.color}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">Priority</p>
                <p className="text-lg font-black capitalize">{rec.priority}</p>
              </div>
            </div>

            {/* HCP + Engagement Status */}
            <div className="flex gap-2 flex-wrap">
              {rec.hcp_status && (
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium capitalize">
                  Status: {rec.hcp_status.replace('-', ' ')}
                </span>
              )}
              {rec.engagement_score !== undefined && (
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium">
                  Engagement: {rec.engagement_score}/10
                </span>
              )}
              {rec.days_since_contact !== null && rec.days_since_contact !== undefined && (
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium">
                  {rec.days_since_contact}d since contact
                </span>
              )}
            </div>

            {/* Engagement Score Breakdown */}
            {rec.engagement_score !== undefined && (
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  How the engagement score is calculated
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Email opens', value: hcpEngagementSignals(rec, 'emailOpens'), max: 10, weight: 0.4, color: 'bg-blue-400' },
                    { label: 'Webinar attendance', value: hcpEngagementSignals(rec, 'webinarAttendance'), max: 5, weight: 0.8, color: 'bg-orange-400' },
                    { label: 'Portal logins', value: hcpEngagementSignals(rec, 'portalLogins'), max: 15, weight: 0.2, color: 'bg-violet-400' },
                    { label: 'Content click-throughs', value: hcpEngagementSignals(rec, 'clickThroughs'), max: 3, weight: 0.5, color: 'bg-emerald-400' },
                  ].map(({ label, value, max, weight, color }) => (
                    <div key={label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-slate-500">{label}</span>
                        <span className="text-[11px] font-semibold text-slate-600">{value} → {(Math.min(value, max) * weight).toFixed(1)} pts</span>
                      </div>
                      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-200">
                  Total: <strong className="text-slate-600">{rec.engagement_score}/10</strong>
                  {rec.engagement_score >= 7 ? ' — 🔥 Hot: act now' : rec.engagement_score >= 4 ? ' — 🌤 Warm: nurture' : ' — ❄️ Cold: re-engage carefully'}
                </p>
              </div>
            )}

            {/* Rationale */}
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb size={13} className="text-indigo-500" />
                <p className="text-xs font-semibold text-indigo-700">Rationale</p>
              </div>
              <p className="text-sm text-indigo-800 leading-relaxed">{rec.rationale}</p>
            </div>

            {/* Recommended Content */}
            {rec.recommended_content?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Recommended Content</p>
                <div className="space-y-2">
                  {rec.recommended_content.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <FileText size={13} className="text-brand-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 leading-tight">{c.title}</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{c.reason}</p>
                        <p className="text-[10px] text-slate-300 mt-1">{c.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Draft Communication */}
            {rec.draft_communication && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Draft Communication</p>
                  <CopyButton text={`Subject: ${rec.draft_communication.subject}\n\n${rec.draft_communication.body}`} />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  {/* Type badge */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-white">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {rec.draft_communication.type?.replace('_', ' ')}
                    </span>
                    <span className="mx-1 text-slate-200">·</span>
                    <span className="text-xs font-medium text-slate-600">{rec.draft_communication.subject}</span>
                  </div>
                  <div className="p-4">
                    <p className="draft-body">{rec.draft_communication.body}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Assumptions & Missing Data */}
            {((rec.assumptions?.length > 0) || (rec.missing_data_flags?.length > 0)) && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowAssumptions(!showAssumptions)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <AlertCircle size={12} className="text-slate-400" />
                    Assumptions & Missing Data ({(rec.assumptions?.length || 0) + (rec.missing_data_flags?.length || 0)})
                  </span>
                  {showAssumptions ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {showAssumptions && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                    {rec.assumptions?.length > 0 && (
                      <div className="pt-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Assumptions</p>
                        <ul className="space-y-1.5">
                          {rec.assumptions.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                              <CheckCircle2 size={11} className="text-slate-300 flex-shrink-0 mt-0.5" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {rec.missing_data_flags?.length > 0 && (
                      <div className="pt-1">
                        <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-2">Missing Data</p>
                        <ul className="space-y-1.5">
                          {rec.missing_data_flags.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                              <AlertTriangle size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Empty State */}
        {!rec && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
              <Sparkles size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">Ready to analyse</p>
            <p className="text-xs text-slate-400 max-w-48 leading-relaxed">
              Select an HCP and click Generate to get an AI-powered engagement recommendation.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
        <p className="text-[10px] text-slate-300">Powered by Groq · Llama 3.3 70B</p>
        <p className="text-[10px] text-slate-300">Rules-first · RAG-enhanced · Compliant</p>
      </div>
    </aside>
  )
}
