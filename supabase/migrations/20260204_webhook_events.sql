-- Webhook Events table for audit trail
-- Tracks all incoming webhooks and their processing results

CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  email TEXT,
  payload JSONB,
  result JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_email ON webhook_events(email);
CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at DESC);

-- Comment
COMMENT ON TABLE webhook_events IS 'Audit trail for incoming webhooks (lemcal, etc.)';
