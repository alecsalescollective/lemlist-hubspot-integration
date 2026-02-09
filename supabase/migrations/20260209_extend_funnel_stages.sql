-- Add status column to processed_leads for tracking funnel progression
-- Values: 'in_sequence', 'sequence_finished', 'meeting_booked'
ALTER TABLE processed_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_sequence';
CREATE INDEX IF NOT EXISTS idx_processed_leads_status ON processed_leads(status);
COMMENT ON COLUMN processed_leads.status IS 'Lead funnel status: in_sequence, sequence_finished, meeting_booked';

-- Create pipeline_opportunities table for future Salesforce integration
-- Tracks: Meeting Held, Qualified Opportunity, Pipeline value
CREATE TABLE IF NOT EXISTS pipeline_opportunities (
    id BIGSERIAL PRIMARY KEY,
    salesforce_opportunity_id TEXT UNIQUE,
    contact_email TEXT,
    contact_name TEXT,
    owner TEXT,
    stage TEXT NOT NULL,          -- 'meeting_held', 'qualified', 'closed_won', 'closed_lost'
    pipeline_value DECIMAL(12,2) DEFAULT 0,
    close_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_opportunities_owner ON pipeline_opportunities(owner);
CREATE INDEX IF NOT EXISTS idx_pipeline_opportunities_stage ON pipeline_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_opportunities_contact ON pipeline_opportunities(contact_email);

-- Enable RLS
ALTER TABLE pipeline_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything" ON pipeline_opportunities
    FOR ALL USING (true) WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_pipeline_opportunities_updated_at
    BEFORE UPDATE ON pipeline_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE pipeline_opportunities IS 'Salesforce pipeline data: meeting held, qualified, closed (future integration)';
