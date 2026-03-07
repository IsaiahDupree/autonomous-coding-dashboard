"""PRD-025: DAG coordination, cron, state machine.

Orchestrates the full acquisition pipeline:
discovery → scoring → warmup → outreach → followup → reporting.
"""

import asyncio
import logging
import signal
import sys
from datetime import datetime, timezone

import httpx

from .config import ACTIVE_HOURS_START, ACTIVE_HOURS_END
from .discovery_agent import run_discovery
from .scoring_agent import run_scoring
from .warmup_agent import execute_warmups, schedule_warmups
from .outreach_agent import run_outreach
from .followup_agent import check_replies, send_followups
from .reporting_agent import generate_weekly_report
from .db.queries import get_active_niches

logger = logging.getLogger(__name__)


class AcquisitionOrchestrator:
    """Main orchestrator for the acquisition pipeline."""

    def __init__(self, *, dry_run: bool = False, cycle_interval: int = 3600):
        self.dry_run = dry_run
        self.cycle_interval = cycle_interval
        self.running = False
        self._client: httpx.AsyncClient | None = None

    async def start(self):
        """Start the orchestrator loop."""
        self.running = True
        self._client = httpx.AsyncClient(timeout=60.0)
        logger.info(f"[orchestrator] Starting (dry_run={self.dry_run}, interval={self.cycle_interval}s)")

        try:
            while self.running:
                if self._is_active_hours():
                    await self.run_cycle()
                else:
                    logger.info("[orchestrator] Outside active hours, sleeping")

                await asyncio.sleep(self.cycle_interval)
        finally:
            await self._client.aclose()

    async def stop(self):
        """Stop the orchestrator."""
        self.running = False
        logger.info("[orchestrator] Stopping")

    async def run_cycle(self) -> dict:
        """Run one full acquisition cycle."""
        client = self._client or httpx.AsyncClient(timeout=60.0)
        results = {}
        cycle_start = datetime.now(timezone.utc)

        logger.info(f"[orchestrator] Starting cycle at {cycle_start.isoformat()}")

        try:
            # Phase 1: Discovery
            niches = await get_active_niches(client)
            discovery_results = []
            for niche in niches:
                for platform in niche.get("platforms", []):
                    result = await run_discovery(
                        client, niche, platform, dry_run=self.dry_run
                    )
                    discovery_results.append(result)
            results["discovery"] = discovery_results

            # Phase 2: Scoring
            results["scoring"] = await run_scoring(
                client, dry_run=self.dry_run
            )

            # Phase 3: Warmup
            results["warmup_schedule"] = await schedule_warmups(
                client, dry_run=self.dry_run
            )
            results["warmup_execute"] = await execute_warmups(
                client, dry_run=self.dry_run
            )

            # Phase 4: Outreach
            results["outreach"] = await run_outreach(
                client, dry_run=self.dry_run
            )

            # Phase 5: Follow-up
            results["replies"] = await check_replies(
                client, dry_run=self.dry_run
            )
            results["followups"] = await send_followups(
                client, dry_run=self.dry_run
            )

        except Exception as e:
            logger.error(f"[orchestrator] Cycle error: {e}")
            results["error"] = str(e)

        duration = (datetime.now(timezone.utc) - cycle_start).total_seconds()
        results["duration_seconds"] = duration
        logger.info(f"[orchestrator] Cycle completed in {duration:.1f}s")

        return results

    def _is_active_hours(self) -> bool:
        now = datetime.now()
        return ACTIVE_HOURS_START <= now.hour < ACTIVE_HOURS_END


async def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Acquisition Orchestrator")
    parser.add_argument("--dry-run", action="store_true", help="Log actions without executing")
    parser.add_argument("--once", action="store_true", help="Run one cycle and exit")
    parser.add_argument("--interval", type=int, default=3600, help="Cycle interval in seconds")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    orchestrator = AcquisitionOrchestrator(
        dry_run=args.dry_run,
        cycle_interval=args.interval,
    )

    if args.once:
        async with httpx.AsyncClient(timeout=60.0) as client:
            orchestrator._client = client
            results = await orchestrator.run_cycle()
            logger.info(f"[orchestrator] Results: {results}")
    else:
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda: asyncio.create_task(orchestrator.stop()))
        await orchestrator.start()


if __name__ == "__main__":
    asyncio.run(main())
