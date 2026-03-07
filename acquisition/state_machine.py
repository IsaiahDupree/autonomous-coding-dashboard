"""Pipeline stage transition validation.

Valid transitions:
  new → qualified → warming → ready_for_dm → contacted → replied → call_booked
  Any stage → archived
  archived → new (re-entry after cooldown)
"""

from datetime import datetime, timedelta, timezone

from .config import ARCHIVE_COOLDOWN_DAYS, PIPELINE_STAGES

VALID_TRANSITIONS: dict[str, list[str]] = {
    "new": ["qualified", "archived"],
    "qualified": ["warming", "ready_for_dm", "archived"],
    "warming": ["ready_for_dm", "archived"],
    "ready_for_dm": ["contacted", "archived"],
    "contacted": ["replied", "archived"],
    "replied": ["call_booked", "archived"],
    "call_booked": ["archived"],
    "archived": ["new"],
}


class InvalidTransitionError(Exception):
    pass


class CooldownViolationError(Exception):
    pass


def validate_transition(
    current_stage: str,
    target_stage: str,
    archived_at: datetime | None = None,
) -> bool:
    """Validate a pipeline stage transition.

    Raises InvalidTransitionError if the transition is not allowed.
    Raises CooldownViolationError if re-entering from archived too soon.
    """
    if current_stage not in VALID_TRANSITIONS:
        raise InvalidTransitionError(
            f"Unknown current stage: {current_stage!r}. "
            f"Valid stages: {PIPELINE_STAGES}"
        )

    if target_stage not in VALID_TRANSITIONS[current_stage]:
        raise InvalidTransitionError(
            f"Cannot transition from {current_stage!r} to {target_stage!r}. "
            f"Valid targets: {VALID_TRANSITIONS[current_stage]}"
        )

    if current_stage == "archived" and target_stage == "new":
        if archived_at is not None:
            cooldown_end = archived_at + timedelta(days=ARCHIVE_COOLDOWN_DAYS)
            now = datetime.now(timezone.utc)
            if now < cooldown_end:
                days_left = (cooldown_end - now).days
                raise CooldownViolationError(
                    f"Contact archived at {archived_at.isoformat()}. "
                    f"Cooldown expires in {days_left} days."
                )

    return True


def get_valid_targets(current_stage: str) -> list[str]:
    """Return valid target stages for the given current stage."""
    return VALID_TRANSITIONS.get(current_stage, [])
