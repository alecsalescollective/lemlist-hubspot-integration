/**
 * Seed script for demo/testing data
 * Run with: node scripts/seed-demo-data.js
 *
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const owners = ['alec', 'janae', 'kate'];
const leadSources = ['linkedin', 'website', 'referral', 'cold_outreach', 'webinar'];
const activityTypes = ['email_opened', 'email_replied', 'email_clicked'];

// Helper to generate random date within range
function randomDate(daysBack) {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

// Helper to pick random from array
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedData() {
  console.log('🌱 Seeding demo data...\n');

  // 1. Seed Processed Leads
  console.log('📋 Creating processed leads...');
  const leads = [];
  for (let i = 1; i <= 150; i++) {
    const owner = pick(owners);
    leads.push({
      contact_id: `demo_contact_${i}`,
      email: `lead${i}@example${Math.floor(i/10)}.com`,
      owner,
      campaign_id: i <= 120 ? `camp_${owner}_${(i % 3) + 1}` : null, // 80% in sequence
      lead_source: pick(leadSources),
      processed_at: randomDate(30).toISOString()
    });
  }

  const { error: leadsError } = await supabase
    .from('processed_leads')
    .upsert(leads, { onConflict: 'contact_id' });

  if (leadsError) {
    console.error('Error seeding leads:', leadsError.message);
  } else {
    console.log(`  ✅ Created ${leads.length} leads`);
  }

  // 2. Seed Campaigns
  console.log('📧 Creating campaigns...');
  const campaigns = [
    { owner: 'alec', name: 'Alec - Q4 Enterprise Outreach', status: 'active', leads: 45, sent: 135, opened: 67, replied: 12 },
    { owner: 'alec', name: 'Alec - Product Launch Follow-up', status: 'active', leads: 32, sent: 96, opened: 48, replied: 8 },
    { owner: 'alec', name: 'Alec - Webinar Attendees', status: 'paused', leads: 28, sent: 56, opened: 34, replied: 6 },
    { owner: 'janae', name: 'Janae - SMB Cold Outreach', status: 'active', leads: 52, sent: 156, opened: 78, replied: 15 },
    { owner: 'janae', name: 'Janae - LinkedIn Warm Leads', status: 'active', leads: 38, sent: 114, opened: 68, replied: 11 },
    { owner: 'kate', name: 'Kate - Enterprise Decision Makers', status: 'active', leads: 41, sent: 123, opened: 61, replied: 9 },
    { owner: 'kate', name: 'Kate - Re-engagement Campaign', status: 'active', leads: 29, sent: 87, opened: 35, replied: 4 },
    { owner: 'kate', name: 'Kate - Referral Partners', status: 'draft', leads: 15, sent: 0, opened: 0, replied: 0 },
  ].map((c, idx) => {
    const base = {
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
    };
    // Add meeting columns if migration has been run (will be ignored if columns don't exist)
    base.meetings_booked = Math.floor(c.replied * 0.4);
    base.meeting_conversion_rate = c.leads > 0 ? Math.round((Math.floor(c.replied * 0.4) / c.leads) * 100 * 10) / 10 : 0;
    return base;
  });

  const { error: campaignsError } = await supabase
    .from('campaigns')
    .upsert(campaigns, { onConflict: 'lemlist_campaign_id' });

  if (campaignsError) {
    console.error('Error seeding campaigns:', campaignsError.message);
  } else {
    console.log(`  ✅ Created ${campaigns.length} campaigns`);
  }

  // 3. Seed Meetings
  console.log('📅 Creating meetings...');
  const meetings = [];
  const meetingTitles = ['Discovery Call', 'Product Demo', 'Follow-up Meeting', 'Technical Review', 'Intro Call'];

  for (let i = 1; i <= 25; i++) {
    const owner = pick(owners);
    const scheduledAt = randomDate(14);
    const isPast = scheduledAt < new Date();

    meetings.push({
      hubspot_meeting_id: `demo_meeting_${i}`,
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
    .upsert(meetings, { onConflict: 'hubspot_meeting_id' });

  if (meetingsError) {
    console.error('Error seeding meetings:', meetingsError.message);
  } else {
    console.log(`  ✅ Created ${meetings.length} meetings`);
  }

  // 4. Seed Tasks
  console.log('✅ Creating tasks...');
  const tasks = [];
  const taskTypes = ['email', 'call', 'linkedin', 'todo'];
  const taskSubjects = [
    'Follow up on demo',
    'Send proposal',
    'Schedule intro call',
    'Connect on LinkedIn',
    'Review pricing',
    'Send case study',
    'Check in after trial',
    'Prepare deck for meeting'
  ];

  for (let i = 1; i <= 30; i++) {
    const owner = pick(owners);
    const daysOffset = Math.floor(Math.random() * 14) - 5; // -5 to +9 days from today
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysOffset);

    tasks.push({
      hubspot_task_id: `demo_task_${i}`,
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
    .upsert(tasks, { onConflict: 'hubspot_task_id' });

  if (tasksError) {
    console.error('Error seeding tasks:', tasksError.message);
  } else {
    console.log(`  ✅ Created ${tasks.length} tasks`);
  }

  // 5. Seed Lead Activities
  console.log('📊 Creating lead activities...');
  const activities = [];
  const campaignNames = campaigns.map(c => c.name);

  for (let i = 1; i <= 50; i++) {
    const owner = pick(owners);
    const campaignName = pick(campaignNames.filter(n => n.toLowerCase().startsWith(owner)));

    activities.push({
      lead_email: `lead${i}@example${Math.floor(i/10)}.com`,
      contact_name: `Lead ${i}`,
      activity_type: pick(activityTypes),
      campaign_id: `camp_${owner}_${(i % 3) + 1}`,
      campaign_name: campaignName || `${owner.charAt(0).toUpperCase() + owner.slice(1)} - Demo Campaign`,
      owner,
      activity_at: randomDate(7).toISOString()
    });
  }

  const { error: activitiesError } = await supabase
    .from('lead_activities')
    .insert(activities);

  if (activitiesError) {
    if (activitiesError.message.includes('does not exist')) {
      console.log('  ⚠️  lead_activities table not found - run the migration first');
    } else {
      console.error('Error seeding activities:', activitiesError.message);
    }
  } else {
    console.log(`  ✅ Created ${activities.length} activities`);
  }

  // 6. Seed Webhook Events (audit log)
  console.log('📝 Creating webhook events...');
  const webhookEvents = [];

  for (let i = 1; i <= 10; i++) {
    webhookEvents.push({
      event_type: 'lemcal_meeting_booked',
      email: `lead${i}@example${Math.floor(i/10)}.com`,
      payload: JSON.stringify({ event: 'meeting_booked', invitee: { email: `lead${i}@example${Math.floor(i/10)}.com` } }),
      result: JSON.stringify({ success: true, status: 'interested' }),
      processed_at: randomDate(7).toISOString()
    });
  }

  const { error: webhookError } = await supabase
    .from('webhook_events')
    .insert(webhookEvents);

  if (webhookError) {
    console.error('Error seeding webhook events:', webhookError.message);
  } else {
    console.log(`  ✅ Created ${webhookEvents.length} webhook events`);
  }

  // 7. Update Sync Status
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
  console.log('\nSummary:');
  console.log('  • 150 processed_leads (120 in sequence)');
  console.log('  • 8 campaigns across 3 owners');
  console.log('  • 30 tasks (overdue, today, upcoming)');
  console.log('  • 25 meetings (mix of scheduled/completed)');
  console.log('  • 50 lead_activities (opens, replies, clicks)');
  console.log('  • 10 webhook_events (audit log)');
  console.log('  • sync_status for all data types');
  console.log('\nRefresh your dashboard to see the data!');
}

seedData().catch(console.error);
