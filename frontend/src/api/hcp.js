const BASE = import.meta.env.VITE_API_URL || '/api'

export async function fetchHCPs() {
  const res = await fetch(`${BASE}/hcps`)
  if (!res.ok) throw new Error('Failed to load HCPs')
  return res.json()
}

export async function fetchHCP(id) {
  const res = await fetch(`${BASE}/hcps/${id}`)
  if (!res.ok) throw new Error(`Failed to load HCP ${id}`)
  return res.json()
}

export async function fetchRecommendation(id) {
  const res = await fetch(`${BASE}/recommend/${id}`, { method: 'POST' })
  if (!res.ok) throw new Error('Recommendation failed')
  return res.json()
}
