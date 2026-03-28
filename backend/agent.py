import json
import os
from datetime import date
from openai import OpenAI
from dotenv import load_dotenv
from rules_engine import apply_rules, calculate_days_since_contact
from content_retriever import retrieve_relevant_content, format_assets_for_prompt

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)
DEPLOYMENT = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


SYSTEM_PROMPT = """You are an HCP Engagement Copilot for a pharmaceutical digital health company.

Your role is to analyze a healthcare professional's profile and engagement history, then produce a precise, clinically intelligent next-best-action recommendation.

CRITICAL RULES:
1. Only recommend content from the PROVIDED content library — never invent content.
2. All guardrail decisions have already been made by the rules engine before you — trust them.
3. Be specific and clinically grounded. The user is a commercial or medical affairs professional speaking to doctors.
4. Flag assumptions and missing data transparently.
5. If the situation calls for restraint (recent contact, low engagement, churned), recommend waiting or a lighter touch.

RATIONALE QUALITY — THIS IS THE MOST IMPORTANT FIELD:
The rationale must answer THREE specific questions, each grounded in the actual data provided:
  (a) WHY this channel? — Cite the specific signal. e.g. "Email was chosen because this HCP has opened X emails recently and clicked through on Y content" OR "F2F was chosen because email open rate is near zero despite Z prior emails sent."
  (b) WHY this content? — Cite the interaction history or therapy area match. e.g. "The GLP-1 evidence summary was selected because the HCP's last webinar was on GLP-1 Receptor Agonists X days ago and they clicked through on metabolics content previously."
  (c) WHY now / this timing? — Cite the days since last contact and engagement window. e.g. "At X days since last contact, this is within the optimal re-engagement window" OR "The high engagement score of Y/10 — driven by Z email opens and W webinar attendances — signals strong readiness."
Write the rationale as 3–4 connected sentences. Never use vague phrases like "is a logical next step" or "makes sense given the profile". Every claim must point to a specific data point.

You must respond ONLY with valid JSON matching this exact schema:
{
  "next_best_action": "<one of: send_email | schedule_call | arrange_f2f | invite_to_webinar | send_newsletter | wait_and_monitor | introductory_outreach>",
  "action_label": "<short human-readable label, e.g. 'Send Clinical Email'>",
  "channel": "<one of: email | phone | f2f | webinar | none>",
  "priority": "<one of: high | medium | low>",
  "timing": "<e.g. 'Within 3 days' | 'This week' | 'Next 2 weeks' | 'Wait 30 days' | 'Do not contact'>",
  "recommended_content": [
    {
      "id": "<asset id>",
      "title": "<asset title>",
      "reason": "<one sentence explaining why this asset fits this HCP, citing a specific prior interaction or therapy area>"
    }
  ],
  "draft_communication": {
    "type": "<email | call_plan | meeting_prep>",
    "subject": "<email subject or call title>",
    "body": "<full draft — personalized, professional, concise. For email: 150-200 words. For call plan: structured bullet points.>"
  },
  "rationale": "<3-4 sentences answering: WHY this channel (cite signal), WHY this content (cite history/match), WHY this timing (cite days since contact and engagement score breakdown)>",
  "assumptions": ["<assumption 1>", "<assumption 2>"],
  "missing_data_flags": ["<flag 1>", "<flag 2>"]
}"""


def build_hcp_context_prompt(hcp: dict, rules_result: dict, content_assets: list) -> str:
    days_since = rules_result.get("days_since_contact")
    engagement_score = rules_result.get("engagement_score", 0)
    hcp_status = rules_result.get("hcp_status", "unknown")

    signals = hcp.get("engagementSignals", {})
    history = hcp.get("interactionHistory", [])
    history_text = "\n".join(
        f"  - {h['date']}: {h['type'].upper()} | Topic: {h['topic']} | Outcome: {h['outcome']}"
        for h in history
    ) if history else "  No prior interactions on record."

    warnings_text = "\n".join(f"  ⚠ {w}" for w in rules_result.get("warnings", [])) or "  None"

    assets_text = format_assets_for_prompt(content_assets)

    # Compute score component contributions for transparency
    email_opens     = signals.get('emailOpens', 0)
    webinar_att     = signals.get('webinarAttendance', 0)
    portal_logins   = signals.get('portalLogins', 0)
    clicked_count   = sum(1 for h in history if "clicked" in h.get("outcome", ""))
    score_breakdown = (
        f"Email opens: {email_opens} (contributes {round(min(email_opens,10)*0.4,1)} pts) | "
        f"Webinar attendance: {webinar_att} (contributes {round(min(webinar_att,5)*0.8,1)} pts) | "
        f"Portal logins: {portal_logins} (contributes {round(min(portal_logins,15)*0.2,1)} pts) | "
        f"Click-throughs in history: {clicked_count} (contributes {round(min(clicked_count,3)*0.5,1)} pts)"
    )

    return f"""
=== HCP PROFILE ===
Name: {hcp['name']}
Specialty: {hcp['specialty']}
Hospital: {hcp['hospital']}, {hcp['city']}, {hcp['country']}
Prescribing Tier: {hcp['prescribingTier'].upper()}
Patient Volume: ~{hcp.get('patientVolume', 'Unknown')} patients
Therapy Areas: {', '.join(hcp.get('therapyAreas', []))}
Preferred Channel: {hcp.get('preferredChannel', 'Unknown')}
HCP Notes: {hcp.get('notes', 'None')}

=== ENGAGEMENT STATUS ===
Status: {hcp_status.upper()}
Engagement Score: {engagement_score}/10
Score Breakdown: {score_breakdown}
Days Since Last Contact: {days_since if days_since is not None else 'Never contacted'}
Last Interaction: {hcp.get('lastInteractionDate', 'N/A')} via {hcp.get('lastInteractionType', 'N/A')}
Email Opens (recent): {email_opens}
Webinar Attendance (recent): {webinar_att}
Portal Logins (recent): {portal_logins}
Click-throughs in history: {clicked_count}

=== INTERACTION HISTORY (most recent first) ===
{history_text}

=== RULES ENGINE OUTPUT ===
Can Contact: {rules_result['can_contact']}
Recommended Channels: {', '.join(rules_result.get('recommended_channels', []))}
Timing Guidance: {rules_result.get('timing_suggestion', 'N/A')}
Warnings:
{warnings_text}

=== AVAILABLE APPROVED CONTENT (use ONLY these) ===
{assets_text}

=== TODAY'S DATE ===
{date.today().isoformat()}

Now produce the JSON recommendation.
""".strip()


async def generate_recommendation(hcp: dict) -> dict:
    """Full agent pipeline: rules → content retrieval → LLM reasoning."""

    # Step 1: Rules engine (runs BEFORE LLM)
    rules_result = apply_rules(hcp)

    # Step 2: Handle hard blocks immediately — no LLM call needed
    if not rules_result["can_contact"]:
        return {
            "guardrail_triggered": True,
            "guardrail_type": rules_result["guardrail_type"],
            "next_best_action": "no_contact",
            "action_label": "Do Not Contact",
            "channel": "none",
            "priority": "none",
            "timing": "Do not contact",
            "blocked_reason": rules_result["blocked_reason"],
            "recommended_content": [],
            "draft_communication": None,
            "rationale": rules_result["blocked_reason"],
            "assumptions": [],
            "missing_data_flags": [],
            "engagement_score": rules_result.get("engagement_score", 0),
            "hcp_status": rules_result.get("hcp_status"),
            "days_since_contact": rules_result.get("days_since_contact"),
            "warnings": rules_result.get("warnings", []),
        }

    # Step 3: Content retrieval
    content_assets = retrieve_relevant_content(
        hcp=hcp,
        recommended_channels=rules_result.get("recommended_channels", []),
        top_k=4
    )

    # Step 4: Build prompt and call LLM
    user_prompt = build_hcp_context_prompt(hcp, rules_result, content_assets)

    response = client.chat.completions.create(
        model=DEPLOYMENT,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_tokens=1800,
    )

    llm_output = json.loads(response.choices[0].message.content)

    # Step 5: Enrich with rules metadata
    llm_output.update({
        "guardrail_triggered": False,
        "guardrail_type": rules_result["guardrail_type"],
        "engagement_score": rules_result.get("engagement_score", 0),
        "hcp_status": rules_result.get("hcp_status"),
        "days_since_contact": rules_result.get("days_since_contact"),
        "warnings": rules_result.get("warnings", []),
        "retrieved_assets": [a["id"] for a in content_assets],
    })

    return llm_output
