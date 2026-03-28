import json
import os
from typing import List


def load_content_library() -> List[dict]:
    base_dir = os.path.dirname(__file__)
    path = os.path.join(base_dir, "data", "content_library.json")
    with open(path, "r") as f:
        return json.load(f)


def retrieve_relevant_content(hcp: dict, recommended_channels: List[str], top_k: int = 4) -> List[dict]:
    """
    Retrieve relevant content assets for an HCP using tag/therapy-area matching.
    Filters by:
      1. Approval status (only 'approved' assets)
      2. Therapy area overlap
      3. Channel compatibility
    Ranks by relevance score.
    """
    library = load_content_library()
    hcp_therapy_areas = hcp.get("therapyAreas", [])

    scored_assets = []
    for asset in library:
        # Hard filter: only approved content
        if asset.get("approvalStatus") != "approved":
            continue

        # Hard filter: channel must be compatible (if channel list is specified)
        asset_channels = asset.get("channels", [])
        channel_match = any(ch in asset_channels for ch in recommended_channels) if recommended_channels else True
        if not channel_match:
            continue

        # Score by therapy area relevance
        relevance = asset.get("relevanceScore", {})
        area_score = 0
        for area in hcp_therapy_areas:
            area_score += relevance.get(area, 0)

        if area_score == 0:
            continue  # No therapy area match — skip

        scored_assets.append({
            **asset,
            "_match_score": area_score
        })

    # Sort by relevance score descending
    scored_assets.sort(key=lambda x: x["_match_score"], reverse=True)

    # Return top_k, clean up internal score field
    top_assets = scored_assets[:top_k]
    for a in top_assets:
        a.pop("_match_score", None)

    return top_assets


def format_assets_for_prompt(assets: List[dict]) -> str:
    """Format content assets as a readable string for the LLM prompt."""
    if not assets:
        return "No approved content assets found matching this HCP's therapy areas and preferred channels."

    lines = []
    for a in assets:
        lines.append(
            f"[{a['id']}] {a['title']}\n"
            f"  Type: {a['type']} | Format: {a['format']} | Channels: {', '.join(a['channels'])}\n"
            f"  Therapy Areas: {', '.join(a['therapyAreas'])}\n"
            f"  Tags: {', '.join(a['tags'])}\n"
            f"  Snippet: {a['snippet']}"
        )
    return "\n\n".join(lines)
