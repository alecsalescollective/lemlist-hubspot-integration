-- Dashboard Tables Migration
-- Creates tables for tasks, meetings, campaigns cache, and sync status

-- ============================================
-- Tasks (cached from HubSpot engagements)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  hubspot_task_id TEXT UNIQUE NOT NULL,
  type TEXT, -- 'email', 'call', 'linkedin', 'todo'
  subject TEXT,
  body TEXT,
  owner TEXT NOT NULL, -- owner name (alec, janae, kate)
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  priority TEXT, -- 'high', 'medium', 'low'
  due_at TIMESTAMPTZ,
  contact_id TEXT,
  contact_name TEXT,
  contact_company TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_hubspot_id ON tasks(hubspot_task_id);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role full access to tasks" ON tasks
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Meetings (cached from HubSpot engagements)
-- ============================================
CREATE TABLE IF NOT EXISTS meetings (
  id BIGSERIAL PRIMARY KEY,
  hubspot_meeting_id TEXT UNIQUE NOT NULL,
  title TEXT,
  owner TEXT NOT NULL, -- owner name (alec, janae, kate)
  scheduled_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  outcome TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'no_show', 'rescheduled', 'cancelled'
  contact_id TEXT,
  contact_name TEXT,
  contact_company TEXT,
  contact_email TEXT,
  source_campaign TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for meetings
CREATE INDEX IF NOT EXISTS idx_meetings_owner ON meetings(owner);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_outcome ON meetings(outcome);
CREATE INDEX IF NOT EXISTS idx_meetings_hubspot_id ON meetings(hubspot_meeting_id);

-- Enable RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role full access to meetings" ON meetings
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Campaigns (cached from Lemlist)
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  lemlist_campaign_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  owner TEXT, -- owner name (alec, janae, kate) - derived from campaign name
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'archived'
  leads_count INT DEFAULT 0,
  emails_sent INT DEFAULT 0,
  emails_opened INT DEFAULT 0,
  emails_replied INT DEFAULT 0,
  emails_bounced INT DEFAULT 0,
  emails_clicked INT DEFAULT 0,
  open_rate DECIMAL(5,2) DEFAULT 0,
  reply_rate DECIMAL(5,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON campaigns(owner);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_lemlist_id ON campaigns(lemlist_campaign_id);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role full access to campaigns" ON campaigns
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Sync Status (tracks data freshness)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_status (
  id BIGSERIAL PRIMARY KEY,
  sync_type TEXT UNIQUE NOT NULL, -- 'tasks', 'meetings', 'campaigns', 'leads'
  last_sync_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'success', 'failed', 'in_progress', 'pending'
  records_synced INT DEFAULT 0,
  error_message TEXT,
  next_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role full access to sync_status" ON sync_status
  FOR ALL USING (true) WITH CHECK (true);

-- Insert initial sync status records
INSERT INTO sync_status (sync_type, status) VALUES
  ('tasks', 'pending'),
  ('meetings', 'pending'),
  ('campaigns', 'pending'),
  ('leads', 'pending')
ON CONFLICT (sync_type) DO NOTHING;

-- ============================================
-- Triggers for updated_at
-- ============================================

-- Reuse existing function if available, or create it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Tasks trigger
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Meetings trigger
DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Campaigns trigger
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sync status trigger
DROP TRIGGER IF EXISTS update_sync_status_updated_at ON sync_status;
CREATE TRIGGER update_sync_status_updated_at
  BEFORE UPDATE ON sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE tasks IS 'HubSpot tasks cached for dashboard display';
COMMENT ON TABLE meetings IS 'HubSpot meetings cached for dashboard display';
COMMENT ON TABLE campaigns IS 'Lemlist campaigns with metrics cached for dashboard';
COMMENT ON TABLE sync_status IS 'Tracks last sync time and status for each data type';
