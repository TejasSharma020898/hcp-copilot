# HCP Engagement Copilot

An AI-powered prototype that helps pharmaceutical commercial teams decide **who to contact, what to say, when to say it — and when to hold back.**

> Built as a practical engineering exercise demonstrating AI agent design, rules-based guardrails, retrieval-augmented content matching, and explainable recommendations.

---

## Live Demo

**App:** [Deployed on Vercel](https://hcp-copilot.vercel.app)
**Presentation:** Open `presentation.html` in your browser (press `F` for fullscreen, `←` `→` to navigate)

---

## What It Does

A rep selects a doctor from a list of 25 synthetic HCPs. The system runs three steps automatically:

1. **Safety & Compliance** — 5 guardrail rules run before the AI sees anything. Hard blocks (opt-out, blackout, 3-day contact gap) stop everything. Soft warnings flag caution.
2. **Content Retrieval** — Approved assets are matched to the HCP by therapy area, channel compatibility, and relevance score. The AI can only recommend from this library.
3. **AI Recommendation** — The LLM reads the full HCP context and produces: a next-best action, recommended content, a draft email or call plan, a rationale citing specific signals, and a list of assumptions and missing data.

---

## The 4 Demo Scenarios

| Scenario | HCP | Signal | System Output |
|---|---|---|---|
| Digitally Engaged | Dr. Priya Sharma | Score 10/10 — 5 webinars, 11 email opens | Invite to SGLT2 webinar |
| Low Engagement | Dr. David Park | Score 0.4/10 — churned 7 months | Soft re-engagement only |
| F2F Preference | Dr. James Okafor | 2 email opens despite many sent | Arrange in-person meeting |
| Wait & Monitor | Dr. Leila Ahmadi | Score 0.6/10 — contacted 6 days ago | AI recommends holding outreach |

Use the **Demo Shortcuts** at the bottom of the sidebar to jump to any scenario instantly.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  Sidebar (HCP list) │ HCP Context View │ AI Copilot     │
└────────────────────────────┬────────────────────────────┘
                             │ REST API
┌────────────────────────────▼────────────────────────────┐
│                    FastAPI Backend                       │
│                                                          │
│  1. Rules Engine  ──►  2. Content Retriever  ──►  3. LLM│
│  (compliance)          (approved assets)      (Groq)    │
└─────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **Rules before AI, always** — compliance is non-negotiable; hard blocks are hard-coded, not probabilistic
- **Approved content only** — LLM is constrained to a pre-tagged library; zero hallucination risk on clinical claims
- **Transparent rationale** — every recommendation cites WHY: specific signal → channel, therapy area → content, days since contact → timing
- **Missing data is visible** — assumptions are listed so reps know what's known vs estimated

---

## Data

| Asset | Count | Detail |
|---|---|---|
| HCP Profiles | 25 | 8 countries, 7 specialties, full interaction history |
| Approved Content Assets | 15 | Tagged by therapy area, channel, and relevance score |
| Compliance Rules | 5 | Opt-out, blackout, frequency, channel preference, timing |
| Demo Scenarios | 4 | Digitally engaged, churned, F2F-only, wait & monitor |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Vite |
| Backend | FastAPI (Python) |
| AI Model | Groq — Llama 3.3 70B |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Local Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # add your GROQ_API_KEY
uvicorn main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env.local   # set VITE_API_URL=http://localhost:8000
npm run dev
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).
