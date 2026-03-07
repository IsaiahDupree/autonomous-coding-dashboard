-- ============================================================
-- Reply Events Table — Reply-to-CRM Bridge (rcb-001)
-- Tracks inbound replies detected from DM inboxes
-- ============================================================

-- Add 'replied' and other CRM stages to pipeline_stage constraint if not already present
ALTER TABLE crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_pipeline_stage_check;
ALTER TABLE crm_contacts ADD CONSTRAINT crm_contacts_pipeline_stage_check
  CHECK (pipeline_stage = ANY (ARRAY[
    'first_touch', 'replied', 'context_captured', 'micro_win_delivered',
    'cadence_established', 'trust_signals', 'fit_repeats',
    'permissioned_offer', 'post_win_expansion', 'customer', 'churned',
    'qualified', 'proposal_sent', 'closed_won', 'closed_lost'
  ]));

CREATE TABLE IF NOT EXISTS reply_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES crm_contacts(id),
  platform text NOT NULL,
  username text NOT NULL,
  message_text text,
  detected_at timestamptz DEFAULT now(),
  next_action_generated text,
  processed boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_reply_events_contact ON reply_events(contact_id, detected_at DESC);
