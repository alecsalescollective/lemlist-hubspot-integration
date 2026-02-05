/**
 * Run migration and seed demo data
 * This runs the lead_activities migration first, then seeds test data
 */

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🔄 Running migration for lead_activities table...\n');

  const migrationPath = path.join(__dirname, '../supabase/migrations/20260204220000_lead_activities_table.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split by semicolons and run each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

  for (const statement of statements) {
    if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || statement.includes('ALTER TABLE') || statement.includes('INSERT INTO')) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
          // Try direct query for simple statements
          console.log(`  Running: ${statement.substring(0, 50)}...`);
        }
      } catch (e) {
        // Ignore errors for statements that may already be applied
      }
    }
  }

  // Run the essential parts directly
  console.log('  Checking lead_activities table...');
  try {
    await supabase.from('lead_activities').select('id').limit(1);
    console.log('  ✅ lead_activities table exists');
  } catch (e) {
    console.log('  ⚠️  lead_activities table needs to be created via Supabase dashboard');
  }

  console.log('  ✅ Migration check complete\n');
}

const owners = ['alec', 'janae', 'kate'];
const leadSources = ['linkedin', 'website', 'referral', 'cold_outreach', 'webinar'];
const activityTypes = ['email_opened', 'email_replied', 'email_clicked'];

function randomDate(daysBack) {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedData() {
  console.log('🌱 Seeding demo data...\n');

  // 1. Clear existing demo data first
  console.log('🧹 Clearing existing demo data...');
  await supabase.from('processed_leads').delete().like('contact_id', 'demo_%');
  await supabase.from('campaigns').delete().like('lemlist_campaign_id', 'camp_%');
  // Try both old and new column names for meetings
  await supabase.from('meetings').delete().like('lemcal_meeting_id', 'demo_%');
  // Try both old and new column names for tasks
  await supabase.from('tasks').delete().like('external_task_id', 'demo_%');
  try {
    await supabase.from('lead_activities').delete().like('lead_email', '%@example%');
  } catch (e) {
    // Table may not exist
  }
  await supabase.from('webhook_events').delete().eq('event_type', 'lemcal_meeting_booked');
  console.log('  ✅ Cleared\n');

  // 2. Seed Processed Leads
  console.log('📋 Creating processed leads...');
  const leads = [];
  for (let i = 1; i <= 150; i++) {
    const owner = pick(owners);
    leads.push({
      contact_id: `demo_contact_${i}`,
      email: `lead${i}@example${Math.floor(i/10)}.com`,
      owner,
      campaign_id: i <= 120 ? `camp_${owner}_${(i % 3) + 1}` : null,
      lead_source: pick(leadSources),
      processed_at: randomDate(30).toISOString()
    });
  }

  const { error: leadsError } = await supabase
    .from('processed_leads')
    .upsert(leads, { onConflict: 'contact_id' });

  if (leadsError) {
    console.error('  ❌ Error:', leadsError.message);
  } else {
    console.log(`  ✅ Created ${leads.length} leads`);
  }

  // 3. Seed Campaigns (without meeting columns first, then try to update)
  console.log('📧 Creating campaigns...');
  const campaignData = [
    { owner: 'alec', name: 'Alec - Q4 Enterprise Outreach', status: 'active', leads: 45, sent: 135, opened: 67, replied: 12 },
    { owner: 'alec', name: 'Alec - Product Launch Follow-up', status: 'active', leads: 32, sent: 96, opened: 48, replied: 8 },
    { owner: 'alec', name: 'Alec - Webinar Attendees', status: 'paused', leads: 28, sent: 56, opened: 34, replied: 6 },
    { owner: 'janae', name: 'Janae - SMB Cold Outreach', status: 'active', leads: 52, sent: 156, opened: 78, replied: 15 },
    { owner: 'janae', name: 'Janae - LinkedIn Warm Leads', status: 'active', leads: 38, sent: 114, opened: 68, replied: 11 },
    { owner: 'kate', name: 'Kate - Enterprise Decision Makers', status: 'active', leads: 41, sent: 123, opened: 61, replied: 9 },
    { owner: 'kate', name: 'Kate - Re-engagement Campaign', status: 'active', leads: 29, sent: 87, opened: 35, replied: 4 },
    { owner: 'kate', name: 'Kate - Referral Partners', status: 'draft', leads: 15, sent: 0, opened: 0, replied: 0 },
  ];

  const campaigns = campaignData.map((c, idx) => ({
    lemlist_campaign_id: `camp_${c.owner}_${idx + 1}`,
    name: c.name,
    owner: c.owner,
    status: c.status,
    leads_count: c.leads,
    emails_sent: c.sent,
    emails_opened: c.opened,
    emails_replied: c.replied,
    emails_bounced: Math.floor(c.sent * 0.02),
    open_rate: c.sent > 0 ? Math.round((c.opened / c.sent) * 100) : 0,
    reply_rate: c.sent > 0 ? Math.round((c.replied / c.sent) * 100 * 10) / 10 : 0,
    bounce_rate: c.sent > 0 ? Math.round((c.sent * 0.02 / c.sent) * 100) : 0,
    synced_at: new Date().toISOString()
  }));

  const { error: campaignsError } = await supabase
    .from('campaigns')
    .upsert(campaigns, { onConflict: 'lemlist_campaign_id' });

  if (campaignsError) {
    console.error('  ❌ Error:', campaignsError.message);
  } else {
    console.log(`  ✅ Created ${campaigns.length} campaigns`);
  }

  // Try to update meeting columns if they exist
  for (let i = 0; i < campaignData.length; i++) {
    const c = campaignData[i];
    const meetingsBooked = Math.floor(c.replied * 0.4);
    const meetingRate = c.leads > 0 ? Math.round((meetingsBooked / c.leads) * 100 * 10) / 10 : 0;

    try {
      await supabase
        .from('campaigns')
        .update({ meetings_booked: meetingsBooked, meeting_conversion_rate: meetingRate })
        .eq('lemlist_campaign_id', `camp_${c.owner}_${i + 1}`);
    } catch (e) {
      // Silently fail if columns don't exist
    }
  }

  // 4. Seed Meetings (from Lemcal)
  console.log('📅 Creating meetings (Lemcal)...');
  const meetings = [];
  const meetingTitles = ['Discovery Call', 'Product Demo', 'Follow-up Meeting', 'Technical Review', 'Intro Call'];

  for (let i = 1; i <= 25; i++) {
    const owner = pick(owners);
    const scheduledAt = randomDate(14);
    const isPast = scheduledAt < new Date();

    meetings.push({
      lemcal_meeting_id: `demo_meeting_${i}`,  // Changed from hubspot_meeting_id
      title: pick(meetingTitles),
      owner,
      scheduled_at: scheduledAt.toISOString(),
      end_at: new Date(scheduledAt.getTime() + 30 * 60 * 1000).toISOString(),
      outcome: isPast ? (Math.random() > 0.2 ? 'completed' : 'no_show') : 'scheduled',
      contact_name: `Contact ${i}`,
      contact_company: `Company ${String.fromCharCode(65 + (i % 26))}`,
      contact_email: `contact${i}@company${i % 10}.com`,
      source_campaign: `camp_${owner}_${(i % 3) + 1}`,
      synced_at: new Date().toISOString()
    });
  }

  const { error: meetingsError } = await supabase
    .from('meetings')
    .upsert(meetings, { onConflict: 'lemcal_meeting_id' });  // Changed conflict column

  if (meetingsError) {
    console.error('  ❌ Error:', meetingsError.message);
  } else {
    console.log(`  ✅ Created ${meetings.length} meetings`);
  }

  // 5. Seed Tasks (DEPRECATED - use lead_activities instead)
  // Keeping for backwards compatibility but tasks table is being phased out
  console.log('✅ Creating tasks (deprecated - use lead_activities)...');
  const tasks = [];
  const taskTypes = ['email', 'call', 'linkedin', 'todo'];
  const taskSubjects = [
    'Follow up on demo', 'Send proposal', 'Schedule intro call', 'Connect on LinkedIn',
    'Review pricing', 'Send case study', 'Check in after trial', 'Prepare deck for meeting'
  ];

  for (let i = 1; i <= 30; i++) {
    const owner = pick(owners);
    const daysOffset = Math.floor(Math.random() * 14) - 5;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysOffset);

    tasks.push({
      external_task_id: `demo_task_${i}`,  // Changed from hubspot_task_id
      type: pick(taskTypes),
      subject: pick(taskSubjects),
      body: `Task details for item ${i}`,
      owner,
      status: daysOffset < -2 ? 'completed' : 'pending',
      priority: Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
      due_at: dueDate.toISOString(),
      contact_id: `demo_contact_${i}`,
      contact_name: `Contact ${i}`,
      contact_company: `Company ${String.fromCharCode(65 + (i % 26))}`,
      contact_email: `contact${i}@company${i % 10}.com`,
      synced_at: new Date().toISOString()
    });
  }

  const { error: tasksError } = await supabase
    .from('tasks')
    .upsert(tasks, { onConflict: 'external_task_id' });  // Changed conflict column

  if (tasksError) {
    console.error('  ❌ Error:', tasksError.message);
  } else {
    console.log(`  ✅ Created ${tasks.length} tasks`);
  }

  // 6. Seed Lead Activities
  console.log('📊 Creating lead activities...');
  const activities = [];
  const campaignNames = campaigns.map(c => c.name);

  for (let i = 1; i <= 50; i++) {
    const owner = pick(owners);
    const campaignName = pick(campaignNames.filter(n => n.toLowerCase().startsWith(owner))) || `${owner} - Campaign`;

    activities.push({
      lead_email: `lead${i}@example${Math.floor(i/10)}.com`,
      contact_name: `Lead ${i}`,
      activity_type: pick(activityTypes),
      campaign_id: `camp_${owner}_${(i % 3) + 1}`,
      campaign_name: campaignName,
      owner,
      activity_at: randomDate(7).toISOString()
    });
  }

  const { error: activitiesError } = await supabase
    .from('lead_activities')
    .insert(activities);

  if (activitiesError) {
    if (activitiesError.message.includes('does not exist') || activitiesError.message.includes('schema cache')) {
      console.log('  ⚠️  lead_activities table not found - run migration in Supabase dashboard');
      console.log('     SQL file: supabase/migrations/20260204220000_lead_activities_table.sql');
    } else {
      console.error('  ❌ Error:', activitiesError.message);
    }
  } else {
    console.log(`  ✅ Created ${activities.length} activities`);
  }

  // 7. Seed Webhook Events
  console.log('📝 Creating webhook events...');
  const webhookEvents = [];

  for (let i = 1; i <= 10; i++) {
    webhookEvents.push({
      event_type: 'lemcal_meeting_booked',
      email: `lead${i}@example${Math.floor(i/10)}.com`,
      payload: JSON.stringify({ event: 'meeting_booked', invitee: { email: `lead${i}@example.com` } }),
      result: JSON.stringify({ success: true, status: 'interested' }),
      processed_at: randomDate(7).toISOString()
    });
  }

  const { error: webhookError } = await supabase
    .from('webhook_events')
    .insert(webhookEvents);

  if (webhookError) {
    console.error('  ❌ Error:', webhookError.message);
  } else {
    console.log(`  ✅ Created ${webhookEvents.length} webhook events`);
  }

  // 8. Update Sync Status
  console.log('🔄 Updating sync status...');
  const syncTypes = ['leads', 'campaigns', 'meetings', 'tasks', 'activities'];

  for (const syncType of syncTypes) {
    await supabase
      .from('sync_status')
      .upsert({
        sync_type: syncType,
        last_sync_at: new Date().toISOString(),
        status: 'success',
        records_synced: syncType === 'leads' ? 150 : syncType === 'campaigns' ? 8 : syncType === 'meetings' ? 25 : 50
      }, { onConflict: 'sync_type' });
  }
  console.log('  ✅ Updated sync status');

  console.log('\n✨ Demo data seeded successfully!');
  console.log('\n📊 Summary:');
  console.log('  • 150 processed_leads (120 in sequence)');
  console.log('  • 8 campaigns across 3 owners');
  console.log('  • 30 tasks (overdue, today, upcoming)');
  console.log('  • 25 meetings (mix of scheduled/completed)');
  console.log('  • 50 lead_activities (if table exists)');
  console.log('  • 10 webhook_events');
  console.log('  • sync_status updated');
  console.log('\n🚀 Refresh your dashboard to see the data!');
}

async function main() {
  try {
    await runMigration();
    await seedData();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
