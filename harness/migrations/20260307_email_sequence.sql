-- Email Follow-up Sequence State Table
-- Tracks per-contact position in the 3-step nurture sequence

CREATE TABLE IF NOT EXISTS email_sequence_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES crm_contacts(id),
  email text NOT NULL,
  sequence_step int DEFAULT 0,
  last_sent_at timestamptz,
  next_send_at timestamptz,
  status text DEFAULT 'active', -- active, replied, unsubscribed, completed, bounced
  emails_sent int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contact_id)
);
CREATE INDEX IF NOT EXISTS idx_email_seq_next ON email_sequence_state(next_send_at, status);
