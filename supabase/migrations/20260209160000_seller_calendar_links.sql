-- Store Lemcal calendar links for each seller
-- These links are passed to Lemlist as the lemcal_calendar_link field
CREATE TABLE IF NOT EXISTS seller_calendar_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner TEXT NOT NULL UNIQUE,
  calendar_link TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on owner for fast lookups during pipeline
CREATE INDEX IF NOT EXISTS idx_seller_calendar_links_owner ON seller_calendar_links (owner);

-- Enable RLS
ALTER TABLE seller_calendar_links ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON seller_calendar_links
  FOR ALL USING (true) WITH CHECK (true);

-- Seed the 3 sellers
INSERT INTO seller_calendar_links (owner, calendar_link) VALUES
  ('alec', 'https://app.lemcal.com/@alecmccullough/sales-strategy-30-mi'),
  ('janae', 'PLACEHOLDER_JANAE_CALENDAR_LINK'),
  ('kate', 'PLACEHOLDER_KATE_CALENDAR_LINK')
ON CONFLICT (owner) DO UPDATE SET
  calendar_link = EXCLUDED.calendar_link,
  updated_at = NOW();
