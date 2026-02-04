-- Create processed_leads table for tracking HubSpot contacts synced to Lemlist
CREATE TABLE IF NOT EXISTS processed_leads (
    id BIGSERIAL PRIMARY KEY,
    contact_id TEXT UNIQUE NOT NULL,
    email TEXT,
    owner TEXT,
    campaign_id TEXT,
    lead_source TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_leads_contact_id ON processed_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_processed_leads_email ON processed_leads(email);
CREATE INDEX IF NOT EXISTS idx_processed_leads_owner ON processed_leads(owner);
CREATE INDEX IF NOT EXISTS idx_processed_leads_processed_at ON processed_leads(processed_at);

-- Enable Row Level Security (RLS)
ALTER TABLE processed_leads ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (backend)
CREATE POLICY "Service role can do everything" ON processed_leads
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_processed_leads_updated_at
    BEFORE UPDATE ON processed_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE processed_leads IS 'Tracks HubSpot contacts that have been synced to Lemlist campaigns';
COMMENT ON COLUMN processed_leads.contact_id IS 'HubSpot contact ID';
COMMENT ON COLUMN processed_leads.email IS 'Contact email address (lowercase)';
COMMENT ON COLUMN processed_leads.owner IS 'HubSpot owner name (alec, janae, kate)';
COMMENT ON COLUMN processed_leads.campaign_id IS 'Lemlist campaign ID the contact was added to';
COMMENT ON COLUMN processed_leads.lead_source IS 'Source of the lead from HubSpot';
COMMENT ON COLUMN processed_leads.processed_at IS 'When the contact was processed/synced';
