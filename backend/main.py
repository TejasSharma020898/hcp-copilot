import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from agent import generate_recommendation

app = FastAPI(title="HCP Engagement Copilot API", version="1.0.0")

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load HCP data once at startup
BASE_DIR = os.path.dirname(__file__)
HCP_PATH = os.path.join(BASE_DIR, "data", "hcps.json")

with open(HCP_PATH, "r") as f:
    HCP_DB = {hcp["id"]: hcp for hcp in json.load(f)}


@app.get("/health")
def health():
    return {"status": "ok", "hcps_loaded": len(HCP_DB)}


@app.get("/hcps")
def list_hcps():
    """Return all HCPs as a summary list."""
    summaries = []
    for hcp in HCP_DB.values():
        from rules_engine import calculate_engagement_score, calculate_days_since_contact
        summaries.append({
            "id": hcp["id"],
            "name": hcp["name"],
            "specialty": hcp["specialty"],
            "hospital": hcp["hospital"],
            "city": hcp["city"],
            "country": hcp["country"],
            "prescribingTier": hcp["prescribingTier"],
            "preferredChannel": hcp["preferredChannel"],
            "therapyAreas": hcp["therapyAreas"],
            "optOut": hcp.get("optOut", False),
            "blackout": hcp.get("blackout", False),
            "lastInteractionDate": hcp.get("lastInteractionDate"),
            "engagementScore": calculate_engagement_score(hcp),
            "daysSinceContact": calculate_days_since_contact(hcp.get("lastInteractionDate")),
        })
    return summaries


@app.get("/hcps/{hcp_id}")
def get_hcp(hcp_id: str):
    """Return full HCP profile."""
    if hcp_id not in HCP_DB:
        raise HTTPException(status_code=404, detail=f"HCP '{hcp_id}' not found.")
    return HCP_DB[hcp_id]


@app.post("/recommend/{hcp_id}")
async def recommend(hcp_id: str):
    """Generate AI-powered next-best-action recommendation for an HCP."""
    if hcp_id not in HCP_DB:
        raise HTTPException(status_code=404, detail=f"HCP '{hcp_id}' not found.")

    hcp = HCP_DB[hcp_id]
    try:
        result = await generate_recommendation(hcp)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
