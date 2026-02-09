-- Salesforce OAuth token storage (same pattern as hubspot_tokens)
CREATE TABLE IF NOT EXISTS salesforce_tokens (
    id BIGSERIAL PRIMARY KEY,
    instance_url TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE salesforce_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything" ON salesforce_tokens
    FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE salesforce_tokens IS 'Salesforce OAuth2 tokens for API access';
