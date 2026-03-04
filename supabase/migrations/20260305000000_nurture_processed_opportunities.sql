-- Track which Closed Lost - Nurture opportunities have been processed
-- Failed records retry automatically; succeeded records are skipped permanently

CREATE TABLE IF NOT EXISTS nurture_processed_opportunities (
  id BIGSERIAL PRIMARY KEY,
  salesforce_opportunity_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  hypothesis TEXT,
  contact_count INTEGER DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nurture_processed_sf_id ON nurture_processed_opportunities(salesforce_opportunity_id);
CREATE INDEX idx_nurture_processed_status ON nurture_processed_opportunities(status);
