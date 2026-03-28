import { MapPin, Building2, Mail, Phone, Users, Calendar, TrendingUp, MessageSquare, Video, UserCheck } from 'lucide-react'

const TIER_CONFIG = {
  high: { label: 'High Prescriber', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  mid:  { label: 'Mid Prescriber',  color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
  low:  { label: 'Low Prescriber',  color: 'bg-slate-50 text-slate-600 border-slate-200',        dot: 'bg-slate-400' },
}

const CHANNEL_ICON = {
  email:   { icon: Mail,         label: 'Email',      color: 'text-blue-500 bg-blue-50' },
  phone:   { icon: Phone,        label: 'Phone',      color: 'text-violet-500 bg-violet-50' },
  f2f:     { icon: UserCheck,    label: 'In-Person',  color: 'text-emerald-500 bg-emerald-50' },
  webinar: { icon: Video,        label: 'Webinar',    color: 'text-orange-500 bg-orange-50' },
}

const OUTCOME_STYLES = {
  'attended':       'bg-emerald-50 text-emerald-700',
  'attended+q&a':   'bg-emerald-100 text-emerald-800',
  'completed':      'bg-blue-50 text-blue-700',
  'opened':         'bg-indigo-50 text-indigo-700',
  'opened+clicked': 'bg-violet-100 text-violet-800',
  'unopened':       'bg-slate-100 text-slate-500',
  'brief-call':     'bg-amber-50 text-amber-700',
  'voicemail':      'bg-slate-100 text-slate-500',
  'speaker':        'bg-purple-100 text-purple-800',
  'registered-no-show': 'bg-red-50 text-red-600',
}

const TYPE_ICON = {
  email:   Mail,
  phone:   Phone,
  f2f:     UserCheck,
  webinar: Video,
}

const AVATAR_COLORS = [
  'from-indigo-400 to-indigo-600','from-violet-400 to-violet-600','from-blue-400 to-blue-600',
  'from-cyan-400 to-cyan-600',    'from-teal-400 to-teal-600',    'from-emerald-400 to-emerald-600',
  'from-rose-400 to-rose-600',    'from-amber-400 to-amber-600',
]
function avatarGrad(id) {
  const n = parseInt(id.replace('hcp-', ''), 10) - 1
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

function Initials({ name }) {
  const parts = name.replace('Dr. ', '').split(' ')
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

function SignalBar({ value, max, color }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysAgo(dateStr) {
  if (!dateStr) return null
  const diff = Math.round((new Date() - new Date(dateStr)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

export default function HCPProfile({ hcp }) {
  if (!hcp) return null

  const tier = TIER_CONFIG[hcp.prescribingTier] || TIER_CONFIG.low
  const channel = CHANNEL_ICON[hcp.preferredChannel] || CHANNEL_ICON.email
  const ChannelIcon = channel.icon
  const signals = hcp.engagementSignals || {}
  const history = hcp.interactionHistory || []

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5 animate-fade-in">

      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGrad(hcp.id)} flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0`}>
            <Initials name={hcp.name} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{hcp.name}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{hcp.specialty}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${tier.color} flex items-center gap-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
                  {tier.label}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${channel.color}`}>
                  <ChannelIcon size={11} />
                  Prefers {channel.label}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                <Building2 size={13} className="text-slate-400" />
                {hcp.hospital}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin size={13} className="text-slate-400" />
                {hcp.city}, {hcp.country}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                <Users size={13} className="text-slate-400" />
                ~{hcp.patientVolume} patients
              </span>
            </div>
          </div>
        </div>

        {/* Therapy areas */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(hcp.therapyAreas || []).map(area => (
            <span key={area} className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
              {area}
            </span>
          ))}
        </div>

        {/* Notes */}
        {hcp.notes && (
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 leading-relaxed">{hcp.notes}</p>
          </div>
        )}

        {/* Status Badges */}
        {(hcp.optOut || hcp.blackout) && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {hcp.optOut && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Opted Out — No Contact
              </div>
            )}
            {hcp.blackout && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Compliance Blackout Active
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Last Contact',
            value: hcp.lastInteractionDate ? daysAgo(hcp.lastInteractionDate) : 'Never',
            sub: formatDate(hcp.lastInteractionDate),
            icon: Calendar,
            color: 'text-blue-500 bg-blue-50',
          },
          {
            label: 'Last Channel',
            value: hcp.lastInteractionType ? hcp.lastInteractionType.toUpperCase() : '—',
            sub: 'Most recent type',
            icon: MessageSquare,
            color: 'text-violet-500 bg-violet-50',
          },
          {
            label: 'Patient Volume',
            value: `~${hcp.patientVolume || '?'}`,
            sub: 'Estimated patients',
            icon: TrendingUp,
            color: 'text-emerald-500 bg-emerald-50',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={15} />
            </div>
            <p className="text-lg font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            <p className="text-[11px] text-slate-300 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Engagement Signals */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Engagement Signals</h3>
        <div className="space-y-4">
          {[
            { label: 'Email Opens', value: signals.emailOpens || 0, max: 15, color: 'bg-blue-400', icon: Mail },
            { label: 'Webinar Attendance', value: signals.webinarAttendance || 0, max: 6, color: 'bg-orange-400', icon: Video },
            { label: 'Portal Logins', value: signals.portalLogins || 0, max: 20, color: 'bg-violet-400', icon: TrendingUp },
          ].map(({ label, value, max, color, icon: Icon }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                </div>
                <span className="text-xs font-bold text-slate-700">{value}</span>
              </div>
              <SignalBar value={value} max={max} color={color} />
            </div>
          ))}
        </div>

        {signals.lastEmailOpenDate && (
          <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-50">
            Last email open: {formatDate(signals.lastEmailOpenDate)}
          </p>
        )}
      </div>

      {/* Interaction History */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          Interaction History
          <span className="ml-2 text-xs font-normal text-slate-400">({history.length} recorded)</span>
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2">
              <Calendar size={18} className="text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">No interactions recorded yet</p>
            <p className="text-xs text-slate-300 mt-1">This is a new HCP in territory</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-100" />

            <div className="space-y-4">
              {history.map((item, i) => {
                const Icon = TYPE_ICON[item.type] || MessageSquare
                const outcomeStyle = OUTCOME_STYLES[item.outcome] || 'bg-slate-100 text-slate-500'
                return (
                  <div key={i} className="flex items-start gap-3 pl-0">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0 z-10">
                      <Icon size={13} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-slate-700">{item.topic}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${outcomeStyle}`}>
                          {item.outcome}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(item.date)} · {item.type}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
