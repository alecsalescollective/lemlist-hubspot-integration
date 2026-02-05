-- Fix Data Sources Migration
-- Changes meetings to use Lemcal instead of HubSpot
-- Removes tasks table (replaced by lead_activities from Lemlist webhooks)

-- ============================================
-- 1. Rename meetings column from hubspot to lemcal
-- ============================================

-- First, drop the unique constraint on the old column name
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_hubspot_meeting_id_key;

-- Rename the column
ALTER TABLE meetings RENAME COLUMN hubspot_meeting_id TO lemcal_meeting_id;

-- Add new unique constraint
ALTER TABLE meetings ADD CONSTRAINT meetings_lemcal_meeting_id_key UNIQUE (lemcal_meeting_id);

-- Drop old index
DROP INDEX IF EXISTS idx_meetings_hubspot_id;

-- Create new index
CREATE INDEX IF NOT EXISTS idx_meetings_lemcal_id ON meetings(lemcal_meeting_id);

-- Allow null owner for meetings (Lemcal may not have owner info)
ALTER TABLE meetings ALTER COLUMN owner DROP NOT NULL;

-- Update table comment
COMMENT ON TABLE meetings IS 'Lemcal meetings synced via API and webhooks';

-- ============================================
-- 2. Tasks table - Keep for now but mark as deprecated
--    Data comes from lead_activities (Lemlist webhooks) instead
-- ============================================

-- Rename column to reflect that it's not hubspot
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_hubspot_task_id_key;
ALTER TABLE tasks RENAME COLUMN hubspot_task_id TO external_task_id;
ALTER TABLE tasks ADD CONSTRAINT tasks_external_task_id_key UNIQUE (external_task_id);

-- Drop old index
DROP INDEX IF EXISTS idx_tasks_hubspot_id;

-- Create new index
CREATE INDEX IF NOT EXISTS idx_tasks_external_id ON tasks(external_task_id);

-- Update table comment
COMMENT ON TABLE tasks IS 'DEPRECATED: Use lead_activities table instead. Tasks will be removed in future migration.';

-- ============================================
-- 3. Update sync_status comments
-- ============================================
COMMENT ON COLUMN sync_status.sync_type IS 'Data type being synced: leads (HubSpot), campaigns (Lemlist), meetings (Lemcal)';

-- ============================================
-- 4. Clear any existing HubSpot meeting/task data
--    since it will be replaced with correct source data
-- ============================================

-- Note: Only run this if you want to clear old data
-- Uncomment the following lines if needed:
-- TRUNCATE TABLE meetings;
-- TRUNCATE TABLE tasks;
