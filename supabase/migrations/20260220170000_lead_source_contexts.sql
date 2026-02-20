-- Source context dictionary for HubSpot source_detail values.
-- Keeps raw source values and richer paragraph context used by Lemlist AI prompts.

CREATE TABLE IF NOT EXISTS lead_source_contexts (
    id BIGSERIAL PRIMARY KEY,
    source_value TEXT NOT NULL UNIQUE,
    context_summary TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_source_contexts_is_active
    ON lead_source_contexts(is_active);

-- Snapshot of the exact source context sent when the lead was processed.
ALTER TABLE processed_leads
    ADD COLUMN IF NOT EXISTS source_context_summary TEXT;

-- Enable RLS and service-role policy (mirrors existing table policy style).
ALTER TABLE lead_source_contexts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'lead_source_contexts'
          AND policyname = 'Service role can do everything on lead_source_contexts'
    ) THEN
        CREATE POLICY "Service role can do everything on lead_source_contexts"
            ON lead_source_contexts
            FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Reuse existing updated_at trigger function if present.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'update_updated_at_column'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_lead_source_contexts_updated_at'
    ) THEN
        CREATE TRIGGER update_lead_source_contexts_updated_at
            BEFORE UPDATE ON lead_source_contexts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMENT ON TABLE lead_source_contexts IS 'Dictionary of HubSpot source detail values to richer context summaries for Lemlist AI';
COMMENT ON COLUMN lead_source_contexts.source_value IS 'Raw HubSpot hs_object_source_detail_1 value';
COMMENT ON COLUMN lead_source_contexts.context_summary IS 'Paragraph summary passed to Lemlist in the existing leadSource field';
COMMENT ON COLUMN processed_leads.source_context_summary IS 'Snapshot of source context summary sent to Lemlist at processing time';
