import json
import os
from datetime import date
from openai import AzureOpenAI
from dotenv import load_dotenv
from rules_engine import apply_rules, calculate_days_since_contact
from content_retriever import retrieve_relevant_content, format_assets_for_prompt

load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
)
DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4.1")


SYSTEM_PROMPT = """You are an HCP Engagement Copilot for a pharmaceutical digital health company.

Your role is to analyze a healthcare professional's profile and engagement history, then produce a precise, clinically intelligent next-best-action recommendation.

CRITICAL RULES:
1. Only recommend content from the PROVIDED content library — never invent content.
2. All guardrail decisions have already been made by the rules engine before you — trust them.
3. Be specific and clinically grounded. The user is a commercial or medical affairs professional speaking to doctors.
4. Always explain WHY — the rationale must be logical and traceable to the HCP data.
5. Flag assumptions and missing data transparently.
6. If the situation calls for restraint (recent contact, low engagement, churned), recommend waiting or a lighter touch.

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
      "reason": "<one sentence explaining why this asset fits this HCP>"
    }
  ],
  "draft_communication": {
    "type": "<email | call_plan | meeting_prep>",
    "subject": "<email subject or call title>",
    "body": "<full draft — personalized, professional, concise. For email: 150-200 words. For call plan: structured bullet points.>"
  },
  "rationale": "<2-3 sentences explaining the recommendation, grounded in the HCP's data>",
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
Days Since Last Contact: {days_since if days_since is not None else 'Never contacted'}
Last Interaction: {hcp.get('lastInteractionDate', 'N/A')} via {hcp.get('lastInteractionType', 'N/A')}
Email Opens (recent): {signals.get('emailOpens', 0)}
Webinar Attendance (recent): {signals.get('webinarAttendance', 0)}
Portal Logins (recent): {signals.get('portalLogins', 0)}

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
