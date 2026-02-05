-- Store HubSpot OAuth tokens with auto-refresh support
CREATE TABLE IF NOT EXISTS hubspot_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one row - we store the current active token
CREATE UNIQUE INDEX IF NOT EXISTS idx_hubspot_tokens_single ON hubspot_tokens ((true));
