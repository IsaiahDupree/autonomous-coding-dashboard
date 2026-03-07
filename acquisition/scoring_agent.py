"""ICP scoring agent — bulk-scores contacts in 'new' stage.

Moves qualified contacts (score >= threshold) to 'qualified' stage.
"""

import logging

import httpx

from .config import ANTHROPIC_API_KEY, SCORING_MODEL
from .db.queries import get_contacts_by_stage, update_contact_stage, log_funnel_event
from .state_machine import validate_transition

logger = logging.getLogger(__name__)

DEFAULT_QUALIFY_THRESHOLD = 60.0


async def run_scoring(
    client: httpx.AsyncClient,
    *,
    threshold: float = DEFAULT_QUALIFY_THRESHOLD,
    batch_size: int = 50,
    dry_run: bool = False,
) -> dict:
    """Score all 'new' contacts and advance qualified ones."""
    contacts = await get_contacts_by_stage(client, "new", limit=batch_size)
    qualified = 0
    skipped = 0
    errors = []

    for contact in contacts:
        contact_id = contact["id"]
        icp_score = contact.get("icp_score")

        if icp_score is None:
            skipped += 1
            continue

        try:
            if float(icp_score) >= threshold:
                validate_transition("new", "qualified")
                if not dry_run:
                    await update_contact_stage(client, contact_id, "qualified")
                    await log_funnel_event(
                        client,
                        contact_id=contact_id,
                        from_stage="new",
                        to_stage="qualified",
                        triggered_by="scoring_agent",
                        metadata={"icp_score": float(icp_score), "threshold": threshold},
                    )
                qualified += 1
                logger.info(f"[scoring] Qualified: {contact_id} (score={icp_score})")
            else:
                skipped += 1
        except Exception as e:
            logger.error(f"[scoring] Error processing {contact_id}: {e}")
            errors.append(str(e))

    return {
        "total_processed": len(contacts),
        "qualified": qualified,
        "skipped": skipped,
        "errors": errors,
    }
