"""Discovery API routes."""

from fastapi import APIRouter, Request

from ...discovery_agent import run_discovery
from ...db.queries import get_active_niches
from ..schemas import DiscoveryRunRequest, DiscoveryRunResponse

router = APIRouter()


@router.post("/run", response_model=DiscoveryRunResponse)
async def trigger_discovery(req: DiscoveryRunRequest, request: Request):
    client = request.app.state.http_client
    niches = await get_active_niches(client)
    niche = next((n for n in niches if n["niche_id"] == req.niche_id), None)
    if not niche:
        return DiscoveryRunResponse(
            niche_id=req.niche_id,
            platform=req.platform,
            contacts_found=0,
            contacts_new=0,
            contacts_skipped=0,
            duration_ms=0,
            errors=[f"Niche {req.niche_id} not found"],
        )

    result = await run_discovery(
        client, niche, req.platform,
        max_results=req.max_results,
        dry_run=req.dry_run,
    )
    return DiscoveryRunResponse(**result)
