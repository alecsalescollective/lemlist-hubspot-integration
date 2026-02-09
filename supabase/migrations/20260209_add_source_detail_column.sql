-- Add source_detail column to processed_leads for granular HubSpot source tracking
-- Stores the value from hs_object_source_detail_1 (e.g., "Contact Us", "LM - Sales Process Audit")
ALTER TABLE processed_leads ADD COLUMN IF NOT EXISTS source_detail TEXT;

CREATE INDEX IF NOT EXISTS idx_processed_leads_source_detail ON processed_leads(source_detail);

COMMENT ON COLUMN processed_leads.source_detail IS 'Detailed source from HubSpot hs_object_source_detail_1 field';
