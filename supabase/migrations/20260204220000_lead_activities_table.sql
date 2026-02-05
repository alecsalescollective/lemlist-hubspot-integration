-- Lead Activities Migration
-- Creates table for tracking Lemlist email activities (opens, replies, clicks)
-- Also adds meeting tracking columns to campaigns

-- ============================================
-- Lead Activities (from Lemlist webhooks)
-- ============================================
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_email TEXT NOT NULL,
  contact_name TEXT,
  activity_type TEXT NOT NULL, -- 'email_opened', 'email_replied', 'email_clicked', 'email_bounced', 'email_sent'
  campaign_id TEXT,
  campaign_name TEXT,
  owner TEXT,
  activity_at TIMESTAMPTZ NOT NULL,
  metadata JSONB, -- Additional activity data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lead_activities
CREATE INDEX IF NOT EXISTS idx_lead_activities_email ON lead_activities(lead_email);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_at ON lead_activities(activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_owner ON lead_activities(owner);
CREATE INDEX IF NOT EXISTS idx_lead_activities_campaign ON lead_activities(campaign_id);

-- Enable RLS
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role full access to lead_activities" ON lead_activities
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Add meeting columns to campaigns table
-- ============================================
DO $$
BEGIN
  -- Add meetings_booked column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'meetings_booked'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN meetings_booked INT DEFAULT 0;
  END IF;

  -- Add meeting_conversion_rate column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'meeting_conversion_rate'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN meeting_conversion_rate DECIMAL(5,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- Update sync_status to include activities
-- ============================================
INSERT INTO sync_status (sync_type, status) VALUES
  ('activities', 'pending')
ON CONFLICT (sync_type) DO NOTHING;

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE lead_activities IS 'Lemlist email activities (opens, replies, clicks) for GTM dashboard';
COMMENT ON COLUMN lead_activities.activity_type IS 'Type of activity: email_opened, email_replied, email_clicked, email_bounced, email_sent';
COMMENT ON COLUMN campaigns.meetings_booked IS 'Number of meetings booked from leads in this campaign';
COMMENT ON COLUMN campaigns.meeting_conversion_rate IS 'Percentage of leads that booked meetings';
