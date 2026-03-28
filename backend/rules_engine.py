from datetime import datetime, date
from typing import Optional


def calculate_days_since_contact(last_interaction_date: Optional[str]) -> Optional[int]:
    if not last_interaction_date:
        return None
    last_date = datetime.strptime(last_interaction_date, "%Y-%m-%d").date()
    return (date.today() - last_date).days


def calculate_engagement_score(hcp: dict) -> float:
    """Score 0-10 based on recent engagement signals."""
    signals = hcp.get("engagementSignals", {})
    score = 0.0

    email_opens = min(signals.get("emailOpens", 0), 10)
    score += email_opens * 0.4

    webinar_attendance = min(signals.get("webinarAttendance", 0), 5)
    score += webinar_attendance * 0.8

    portal_logins = min(signals.get("portalLogins", 0), 15)
    score += portal_logins * 0.2

    history = hcp.get("interactionHistory", [])
    clicked = sum(1 for h in history if "clicked" in h.get("outcome", ""))
    score += min(clicked, 3) * 0.5

    return round(min(score, 10.0), 1)


def apply_rules(hcp: dict) -> dict:
    """
    Run all business rules BEFORE LLM. Returns a structured rules result.
    Rules are applied in priority order — first match wins for blocking rules.
    """
    result = {
        "can_contact": True,
        "blocked": False,
        "blocked_reason": None,
        "guardrail_type": None,   # "hard_block" | "soft_warning" | "clear"
        "warnings": [],
        "recommended_channels": [],
        "timing_suggestion": None,
        "days_since_contact": None,
        "engagement_score": 0.0,
        "hcp_status": None,       # "new" | "active" | "churned" | "re-engaging"
    }

    # --- Rule 0: Opt-out check (HARD BLOCK) ---
    if hcp.get("optOut", False):
        result.update({
            "can_contact": False,
            "blocked": True,
            "blocked_reason": "This HCP has opted out of all commercial communications. No outreach permitted via any channel.",
            "guardrail_type": "hard_block",
            "timing_suggestion": "Do not contact — opt-out is active."
        })
        return result

    # --- Rule 1: Blackout period check (HARD BLOCK) ---
    if hcp.get("blackout", False):
        reason = hcp.get("blackoutReason", "Compliance blackout active.")
        result.update({
            "can_contact": False,
            "blocked": True,
            "blocked_reason": reason,
            "guardrail_type": "hard_block",
            "timing_suggestion": "Do not contact until blackout is lifted. Check compliance calendar."
        })
        return result

    # --- Compute engagement score and days since last contact ---
    engagement_score = calculate_engagement_score(hcp)
    result["engagement_score"] = engagement_score
    days_since = calculate_days_since_contact(hcp.get("lastInteractionDate"))
    result["days_since_contact"] = days_since

    # --- Rule 2: Too recent contact (SOFT WARNING) ---
    if days_since is not None and days_since < 7:
        result["warnings"].append(
            f"Last contact was only {days_since} day(s) ago. Contacting too frequently may feel intrusive. Recommended minimum gap: 7 days."
        )
        result["guardrail_type"] = "soft_warning"

    # --- Determine HCP status ---
    if hcp.get("lastInteractionDate") is None:
        result["hcp_status"] = "new"
    elif days_since is not None and days_since > 90:
        result["hcp_status"] = "churned"
    elif days_since is not None and days_since > 45:
        result["hcp_status"] = "re-engaging"
    else:
        result["hcp_status"] = "active"

    # --- Rule 3: Frequency check for very recent contact ---
    if days_since is not None and days_since < 3:
        result.update({
            "can_contact": False,
            "blocked": True,
            "blocked_reason": f"Contacted {days_since} day(s) ago. Minimum 3-day gap enforced to avoid over-contacting.",
            "guardrail_type": "hard_block",
            "timing_suggestion": "Wait at least 3 days before next outreach."
        })
        return result

    # --- Rule 4: Channel preference enforcement ---
    preferred = hcp.get("preferredChannel", "email")
    all_channels = ["email", "phone", "f2f", "webinar"]

    # Build recommended channels based on preference + engagement signals
    recommended = [preferred]
    history = hcp.get("interactionHistory", [])
    last_type = hcp.get("lastInteractionType")

    if preferred == "f2f" and last_type == "f2f" and days_since and days_since < 21:
        result["warnings"].append(
            "Last interaction was an in-person meeting less than 3 weeks ago. Consider a lighter-touch follow-up (email/phone) before the next F2F."
        )
        recommended = ["email", "phone"]
    elif preferred == "email":
        # Check if email engagement is low — suggest alternative
        email_opens = hcp.get("engagementSignals", {}).get("emailOpens", 0)
        if email_opens == 0 and len(history) >= 2:
            result["warnings"].append(
                "Email open rate is zero despite prior email outreach. Consider switching to a different channel."
            )
            recommended = ["phone", "f2f"]
        else:
            recommended = ["email"]
    elif preferred == "phone":
        recommended = ["phone"]
    elif preferred == "webinar":
        recommended = ["webinar", "email"]

    result["recommended_channels"] = recommended

    # --- Rule 5: Timing suggestions based on status ---
    if result["hcp_status"] == "new":
        result["timing_suggestion"] = "New HCP — lead with introductory, low-commitment outreach. Warm, educational tone."
    elif result["hcp_status"] == "churned":
        result["timing_suggestion"] = f"No engagement for {days_since} days. Soft re-engagement recommended — avoid heavy sales messaging."
    elif result["hcp_status"] == "re-engaging":
        result["timing_suggestion"] = f"Last contact {days_since} days ago — good re-engagement window. Use relevant clinical content."
    else:
        result["timing_suggestion"] = "Active HCP — proceed with next best content based on engagement signals."

    # --- Set guardrail type if still clear ---
    if not result["guardrail_type"]:
        result["guardrail_type"] = "clear"

    return result
