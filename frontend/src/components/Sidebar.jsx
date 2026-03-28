import { useState } from 'react'
import {
  Search, Activity, Shield, UserX, Clock,
  ChevronRight, Zap, AlertTriangle, Users, PauseCircle
} from 'lucide-react'

const SPECIALTY_COLORS = {
  'Endocrinology':        'bg-purple-100 text-purple-700',
  'HIV / Infectious Disease': 'bg-red-100 text-red-700',
  'Cardiovascular':       'bg-rose-100 text-rose-700',
  'Oncology':             'bg-orange-100 text-orange-700',
  'Mental Health':        'bg-teal-100 text-teal-700',
  'Maternal Health':      'bg-pink-100 text-pink-700',
  'Respiratory':          'bg-sky-100 text-sky-700',
}

const TIER_STYLES = {
  high:  'bg-emerald-500',
  mid:   'bg-amber-400',
  low:   'bg-slate-400',
}

function engagementLabel(score) {
  if (score === null || score === undefined) return { label: 'New', color: 'text-slate-400' }
  if (score >= 7)  return { label: 'Hot',  color: 'text-emerald-500' }
  if (score >= 4)  return { label: 'Warm', color: 'text-amber-500' }
  return               { label: 'Cold', color: 'text-slate-400' }
}

function Initials({ name }) {
  const parts = name.replace('Dr. ', '').split(' ')
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-cyan-500',
  'bg-teal-500',   'bg-emerald-500','bg-rose-500',  'bg-amber-500',
]

function avatarColor(id) {
  const n = parseInt(id.replace('hcp-', ''), 10) - 1
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

// Demo scenario quick-loads
const DEMO_SCENARIOS = [
  { id: 'hcp-003', label: 'Digitally Engaged',    icon: Zap,         color: 'text-emerald-400', desc: 'High signals — invite to webinar' },
  { id: 'hcp-006', label: 'Low Engagement',        icon: Clock,       color: 'text-amber-400',   desc: 'Churned 7 months — soft re-engage' },
  { id: 'hcp-002', label: 'F2F Preference',         icon: Users,       color: 'text-blue-400',    desc: 'Ignores email — book in-person' },
  { id: 'hcp-011', label: 'Wait & Monitor',         icon: PauseCircle, color: 'text-yellow-400',  desc: 'Too soon — hold outreach' },
  { id: 'hcp-010', label: 'Compliance Block',       icon: Shield,      color: 'text-red-400',     desc: 'AE reported — do not contact' },
]

export default function Sidebar({ hcps, selectedId, onSelect }) {
  const [search, setSearch] = useState('')
  const [filterSpec, setFilterSpec] = useState('All')

  const specialties = ['All', ...new Set(hcps.map(h => h.specialty))]

  const filtered = hcps.filter(h => {
    const q = search.toLowerCase()
    const matchSearch = h.name.toLowerCase().includes(q) ||
                        h.specialty.toLowerCase().includes(q) ||
                        h.city.toLowerCase().includes(q)
    const matchSpec = filterSpec === 'All' || h.specialty === filterSpec
    return matchSearch && matchSpec
  })

  return (
    <aside className="w-72 flex-shrink-0 bg-[#0B1D3A] flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">HCP Copilot</p>
            <p className="text-white/40 text-[10px] tracking-wide uppercase">Engagement Intelligence</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search HCPs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-brand-500/60 focus:bg-white/8 transition-colors"
          />
        </div>
      </div>

      {/* Specialty Filter */}
      <div className="px-4 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['All', 'Endocrinology', 'HIV / Infectious Disease', 'Cardiovascular', 'Oncology', 'Mental Health', 'Maternal Health', 'Respiratory'].map(s => (
            <button
              key={s}
              onClick={() => setFilterSpec(s)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                filterSpec === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10'
              }`}
            >
              {s === 'HIV / Infectious Disease' ? 'HIV' : s}
            </button>
          ))}
        </div>
      </div>

      {/* HCP Count */}
      <div className="px-4 pb-2">
        <p className="text-white/30 text-[10px] uppercase tracking-wider font-medium">
          {filtered.length} HCP{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* HCP List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-2">
        {filtered.map(hcp => {
          const eng = engagementLabel(hcp.engagementScore)
          const isSelected = hcp.id === selectedId
          const isBlocked = hcp.optOut || hcp.blackout

          return (
            <button
              key={hcp.id}
              onClick={() => onSelect(hcp.id)}
              className={`w-full text-left rounded-xl p-3 transition-all group ${
                isSelected
                  ? 'bg-brand-600 shadow-lg shadow-brand-600/30'
                  : 'hover:bg-white/8 bg-transparent'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${avatarColor(hcp.id)}`}>
                  <Initials name={hcp.name} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-white/85'}`}>
                      {hcp.name}
                    </p>
                    {isBlocked && (
                      <AlertTriangle size={11} className="flex-shrink-0 text-amber-400" />
                    )}
                  </div>
                  <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-white/40'}`}>
                    {hcp.specialty}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {/* Tier dot */}
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${TIER_STYLES[hcp.prescribingTier]}`} />
                      <span className={`text-[10px] capitalize ${isSelected ? 'text-white/60' : 'text-white/35'}`}>
                        {hcp.prescribingTier}
                      </span>
                    </div>
                    {/* Engagement */}
                    <span className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : eng.color}`}>
                      {eng.label}
                    </span>
                    {/* Location */}
                    <span className={`text-[10px] truncate ${isSelected ? 'text-white/50' : 'text-white/30'}`}>
                      {hcp.city}
                    </span>
                  </div>
                </div>

                <ChevronRight
                  size={12}
                  className={`flex-shrink-0 mt-1 transition-opacity ${isSelected ? 'text-white opacity-100' : 'text-white/20 opacity-0 group-hover:opacity-100'}`}
                />
              </div>
            </button>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-white/30 text-sm">No HCPs match your search.</div>
        )}
      </div>

      {/* Demo Scenarios */}
      <div className="border-t border-white/10 px-4 py-4">
        <p className="text-white/30 text-[10px] uppercase tracking-wider font-medium mb-2.5">Demo Scenarios</p>
        <div className="space-y-1.5">
          {DEMO_SCENARIOS.map(s => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <Icon size={13} className={s.color} />
                <div className="min-w-0">
                  <p className="text-white/80 text-xs font-medium leading-tight">{s.label}</p>
                  <p className="text-white/30 text-[10px]">{s.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
