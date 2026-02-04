# Product Requirements Document: Sales Lead Dashboard (Frontend)

**Document Version:** 1.0  
**Created:** February 4, 2026  
**Author:** Alec  
**Status:** Draft  

---

## Executive Summary

This document outlines the frontend requirements for a sales lead management dashboard. The dashboard provides real-time visibility into lead distribution, campaign performance, task management, and meeting conversion across three sales team members (Alec, Janae, Kate).

The backend API is already built. This PRD covers the React frontend only.

---

## Problem Statement

Sales leadership lacks a unified view of pipeline health. Performance data is siloed across HubSpot and Lemlist, making it difficult to:

- See lead volume and distribution by owner at a glance
- Monitor which campaigns are performing vs struggling
- Catch overdue follow-ups before leads go cold
- Track the ultimate success metric: meetings booked

---

## Goals

1. Single-screen visibility into lead flow and ownership
2. Surface campaign performance metrics from Lemlist
3. Highlight overdue tasks requiring immediate attention
4. Track lead → meeting conversion as the key success metric
5. Enable filtering by owner and date range

---

## Users

| User | Role | Primary Use |
|------|------|-------------|
| Alec | Sales + Admin | Monitor team performance, own leads |
| Janae | Sales | Monitor own leads and tasks |
| Kate | Sales | Monitor own leads and tasks |

---

## Technical Constraints

- **Backend:** REST API (already built)
- **Auth:** None required (internal tool, trusted network)
- **Browser:** Modern browsers (Chrome, Safari, Edge)
- **Responsive:** Desktop-first, mobile nice-to-have

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Data Fetching | React Query (TanStack Query) |
| Icons | Lucide React |
| Date Handling | date-fns |

---

## API Endpoints (Backend Already Built)

The frontend will consume these existing endpoints:

```
GET /api/leads/summary          → Lead counts by owner, status, source
GET /api/leads?owner={owner}    → Detailed leads list
GET /api/campaigns              → All campaigns with stats
GET /api/campaigns/:id          → Single campaign details
GET /api/tasks                  → All tasks
GET /api/tasks/overdue          → Overdue tasks only
GET /api/meetings               → All meetings
GET /api/meetings/stats         → Conversion rates
GET /api/sync/status            → Last sync timestamp
```

---

## Information Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DASHBOARD                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  HEADER                                                  │    │
│  │  Logo    [All Owners ▼]    [Last 7 Days ▼]    🔄 Synced │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  KPI BAR                                                 │    │
│  │  [ Total Leads ]  [ In Sequence ]  [ Meetings ]  [ Rate ]│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │                      │  │                              │    │
│  │   LEAD OVERVIEW      │  │   CAMPAIGN PERFORMANCE       │    │
│  │                      │  │                              │    │
│  │                      │  │                              │    │
│  └──────────────────────┘  └──────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │                      │  │                              │    │
│  │   TASK TRACKER       │  │   MEETING TRACKER            │    │
│  │                      │  │                              │    │
│  │                      │  │                              │    │
│  └──────────────────────┘  └──────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### C1: Header

**Purpose:** Global controls and sync status

**Elements:**
| Element | Type | Behavior |
|---------|------|----------|
| Logo/Title | Static | "Lead Dashboard" |
| Owner Filter | Dropdown | Options: All, Alec, Janae, Kate. Filters all panels. |
| Date Range Filter | Dropdown | Options: Today, Last 7 Days, Last 30 Days, This Month, Custom |
| Sync Status | Badge + Text | Shows "Synced 2 min ago" or "Syncing..." |
| Refresh Button | Icon Button | Triggers manual data refresh |

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Lead Dashboard          [All Owners ▼]  [Last 7 Days ▼]  🔄 │
│                                               Synced 2 min ago  │
└─────────────────────────────────────────────────────────────────┘
```

---

### C2: KPI Bar

**Purpose:** At-a-glance key metrics

**Cards:**
| KPI | Value | Subtext |
|-----|-------|---------|
| Total Leads | Count | "+12 vs last period" (green/red) |
| In Sequence | Count | "% of total" |
| Meetings Booked | Count | "+3 vs last period" |
| Conversion Rate | Percentage | "Meetings / Leads enrolled" |

**Design:**
- 4 cards in a horizontal row
- Each card: large number, label below, trend indicator
- Trend: green up arrow or red down arrow with delta

**Wireframe:**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│     107      │ │      62      │ │      14      │ │    13.1%     │
│  Total Leads │ │  In Sequence │ │   Meetings   │ │  Conv. Rate  │
│   ▲ 12       │ │   ▲ 8        │ │   ▲ 3        │ │   ▲ 2.1%     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**API Data:**
```json
// GET /api/leads/summary
{
  "total": 107,
  "by_status": { "new": 45, "enriched": 38, "in_sequence": 62, "converted": 14 },
  "delta_vs_previous": 12
}

// GET /api/meetings/stats
{
  "total": 14,
  "conversion_rate": 0.131,
  "delta_vs_previous": 3
}
```

---

### C3: Lead Overview Panel

**Purpose:** Lead distribution by owner, status, and source

**Sections:**

**3a. Leads by Owner**
- 3 cards (Alec, Janae, Kate)
- Each shows: count, percentage change vs prior period
- Visual: colored card or avatar

**3b. Leads by Status**
- Horizontal stacked bar or simple bar chart
- Statuses: New, Enriched, In Sequence, Converted
- Color coded (e.g., gray → blue → purple → green)

**3c. Leads by Source**
- Horizontal bar chart or pie chart
- Sources: Contact Us, PPC, Lead Magnet, Other

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────┐
│  LEAD OVERVIEW                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BY OWNER                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ 👤 ALEC     │  │ 👤 JANAE    │  │ 👤 KATE     │              │
│  │    42       │  │    38       │  │    27       │              │
│  │   ▲ 12%     │  │   ▼ 5%      │  │   ▲ 8%      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  BY STATUS                                                       │
│  New        ████████████████░░░░░░░░░░░░░░░░░░░  45             │
│  Enriched   ████████████░░░░░░░░░░░░░░░░░░░░░░░  38             │
│  In Seq     ████████████████████████░░░░░░░░░░░  62             │
│  Converted  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  14             │
│                                                                  │
│  BY SOURCE                                                       │
│  Contact Us   ████████████  32                                   │
│  PPC          ████████████████  41                               │
│  Lead Magnet  ██████████  28                                     │
│  Other        ███  6                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**API Data:**
```json
// GET /api/leads/summary
{
  "by_owner": {
    "alec": { "count": 42, "delta_pct": 12 },
    "janae": { "count": 38, "delta_pct": -5 },
    "kate": { "count": 27, "delta_pct": 8 }
  },
  "by_status": {
    "new": 45,
    "enriched": 38,
    "in_sequence": 62,
    "converted": 14
  },
  "by_source": {
    "contact_us": 32,
    "ppc": 41,
    "lead_magnet": 28,
    "other": 6
  }
}
```

---

### C4: Campaign Performance Panel

**Purpose:** Lemlist campaign metrics

**Display:** Table with key metrics per campaign

**Columns:**
| Column | Description |
|--------|-------------|
| Status | 🟢 Active, 🟡 Paused, 🔴 Needs Attention |
| Campaign | Campaign name |
| Owner | Alec / Janae / Kate |
| Leads | Number enrolled |
| Sent | Emails sent |
| Opens | Open count |
| Replies | Reply count |
| Reply Rate | Replies / Sent (percentage) |

**Behavior:**
- Sort by any column (default: Reply Rate desc)
- Flag campaigns with reply rate < 10% as "Needs Attention"
- Owner filter from header applies here

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────┐
│  CAMPAIGN PERFORMANCE                              [Sort: Rate ▼]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Status  Campaign              Owner   Leads  Sent  Opens  Reply │
│  ────────────────────────────────────────────────────────────── │
│  🟢      Alec - Contact Us     Alec     24     72    58    16.7% │
│  🟢      Janae - PPC           Janae    22     66    52    21.2% │
│  🟢      Kate - Contact Us     Kate     19     57    44    15.8% │
│  🟢      Alec - Lead Magnet    Alec     18     54    41    14.8% │
│  🟡      Janae - Contact Us    Janae    31     93    67    11.8% │
│  🔴      Kate - Lead Magnet    Kate     15     45    28     6.7% │
│                                                                  │
│  Legend: 🟢 Active  🟡 Paused  🔴 < 10% Reply Rate              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**API Data:**
```json
// GET /api/campaigns
[
  {
    "id": "camp_123",
    "name": "Alec - Contact Us",
    "owner": "alec",
    "status": "active",
    "leads_count": 24,
    "emails_sent": 72,
    "emails_opened": 58,
    "emails_replied": 12,
    "reply_rate": 0.167
  }
]
```

---

### C5: Task Tracker Panel

**Purpose:** Surface overdue and upcoming tasks

**Sections:**
1. **Overdue** (red) - Tasks past due date
2. **Today** - Tasks due today
3. **Upcoming** - Tasks due in next 7 days

**Task Row Elements:**
| Element | Description |
|---------|-------------|
| Icon | ✉️ Email, 📞 Call, 🔗 LinkedIn, 📋 Custom |
| Description | Task description / lead name |
| Owner | Alec / Janae / Kate |
| Due | Relative time ("2 days ago", "in 3 hours", "Tomorrow") |

**Behavior:**
- Overdue section always visible if count > 0
- Collapsed sections for Today/Upcoming (expandable)
- Owner filter applies
- Badge count on section headers

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────┐
│  TASKS                                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔴 OVERDUE (7)                                          [Hide] │
│  ─────────────────────────────────────────────────────────────  │
│  ✉️  Follow up with John Smith           Alec      2 days ago   │
│  📞  Call Sarah Johnson                  Janae     1 day ago    │
│  ✉️  Send case study to Mike Chen        Kate      1 day ago    │
│  ✉️  Step 3 to David Park                Alec      18 hours ago │
│                                                                  │
│  📅 TODAY (12)                                           [Show] │
│  ─────────────────────────────────────────────────────────────  │
│  ✉️  Step 2 email to Lisa Wang           Alec      in 2 hours   │
│  🔗  LinkedIn connect with Tom           Janae     in 4 hours   │
│  📞  Discovery call with Amy             Kate      in 6 hours   │
│                                                                  │
│  📆 UPCOMING (23)                                        [Show] │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**API Data:**
```json
// GET /api/tasks
[
  {
    "id": "task_456",
    "type": "email",
    "description": "Follow up with John Smith",
    "lead_name": "John Smith",
    "owner": "alec",
    "due_at": "2026-02-02T14:00:00Z",
    "status": "overdue"
  }
]

// GET /api/tasks/overdue
// Same structure, filtered to overdue only
```

---

### C6: Meeting Tracker Panel

**Purpose:** Track meetings and conversion

**Sections:**

**6a. Conversion Rate by Owner**
- 3 mini progress bars (one per owner)
- Shows: percentage, visual bar
- Team average below

**6b. Upcoming Meetings**
- List of next 5 meetings
- Shows: Contact name, Company, Owner, Date/Time

**6c. Recent Meeting Results**
- Last 5 completed meetings
- Status: ✅ Completed, ❌ No-show, 🔄 Rescheduled

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────┐
│  MEETINGS                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CONVERSION RATE                                                 │
│  Alec    ████████████░░░░░░  12.4%                              │
│  Janae   ████████░░░░░░░░░░   9.8%                              │
│  Kate    ██████████░░░░░░░░  11.2%                              │
│                                                                  │
│  Team Average: 11.1%  ▲ 2.3% vs last week                       │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  UPCOMING                                                        │
│  📅  John Smith @ Acme Corp           Alec     Today 2:00 PM    │
│  📅  Sarah Chen @ TechStart           Janae    Today 4:30 PM    │
│  📅  Mike Park @ GlobalFin            Kate     Tomorrow 10 AM   │
│                                                                  │
│  RECENT RESULTS                                                  │
│  ✅  Lisa Wang @ DataCo               Alec     Completed         │
│  ❌  Tom Wilson @ StartupXYZ          Janae    No-show           │
│  🔄  Amy Liu @ Enterprise Inc         Kate     Rescheduled       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**API Data:**
```json
// GET /api/meetings/stats
{
  "by_owner": {
    "alec": { "rate": 0.124, "meetings": 5, "leads": 40 },
    "janae": { "rate": 0.098, "meetings": 4, "leads": 41 },
    "kate": { "rate": 0.112, "meetings": 3, "leads": 27 }
  },
  "team_average": 0.111,
  "delta_vs_previous": 0.023
}

// GET /api/meetings
[
  {
    "id": "mtg_789",
    "contact_name": "John Smith",
    "company": "Acme Corp",
    "owner": "alec",
    "scheduled_at": "2026-02-04T14:00:00Z",
    "status": "scheduled"
  }
]
```

---

## Design System

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#3B82F6` | Buttons, links, active states |
| Success | `#10B981` | Positive trends, completed, active |
| Warning | `#F59E0B` | Paused, attention needed |
| Danger | `#EF4444` | Overdue, negative trends, errors |
| Gray 50 | `#F9FAFB` | Background |
| Gray 100 | `#F3F4F6` | Card backgrounds |
| Gray 500 | `#6B7280` | Secondary text |
| Gray 900 | `#111827` | Primary text |

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Page Title | 24px | 600 |
| Panel Title | 16px | 600 |
| KPI Number | 32px | 700 |
| Body | 14px | 400 |
| Small/Caption | 12px | 400 |

### Spacing

- Panel padding: 24px
- Card padding: 16px
- Gap between panels: 24px
- Gap between elements: 16px

### Components

| Component | Notes |
|-----------|-------|
| Cards | Rounded corners (8px), subtle shadow, white background |
| Buttons | Rounded (6px), primary uses Primary color |
| Dropdowns | Tailwind UI style, chevron icon |
| Tables | No borders, alternating row colors, hover state |
| Progress Bars | 8px height, rounded full |
| Badges | Pill shape, colored background |

---

## State Management

### React Query Setup

```javascript
// Query keys
const queryKeys = {
  leads: ['leads'],
  leadsSummary: ['leads', 'summary'],
  campaigns: ['campaigns'],
  tasks: ['tasks'],
  tasksOverdue: ['tasks', 'overdue'],
  meetings: ['meetings'],
  meetingsStats: ['meetings', 'stats'],
  syncStatus: ['sync', 'status']
};

// Refetch intervals
const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes
```

### Filter State

```javascript
// Global filter context
{
  owner: 'all' | 'alec' | 'janae' | 'kate',
  dateRange: 'today' | '7d' | '30d' | 'month' | { start: Date, end: Date }
}
```

---

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── KPIBar.jsx
│   │   └── Panel.jsx
│   ├── leads/
│   │   ├── LeadOverview.jsx
│   │   ├── LeadsByOwner.jsx
│   │   ├── LeadsByStatus.jsx
│   │   └── LeadsBySource.jsx
│   ├── campaigns/
│   │   ├── CampaignPerformance.jsx
│   │   └── CampaignTable.jsx
│   ├── tasks/
│   │   ├── TaskTracker.jsx
│   │   ├── TaskSection.jsx
│   │   └── TaskRow.jsx
│   ├── meetings/
│   │   ├── MeetingTracker.jsx
│   │   ├── ConversionRates.jsx
│   │   ├── UpcomingMeetings.jsx
│   │   └── RecentResults.jsx
│   └── shared/
│       ├── KPICard.jsx
│       ├── ProgressBar.jsx
│       ├── Badge.jsx
│       ├── Dropdown.jsx
│       └── Spinner.jsx
├── hooks/
│   ├── useLeads.js
│   ├── useCampaigns.js
│   ├── useTasks.js
│   ├── useMeetings.js
│   └── useSyncStatus.js
├── context/
│   └── FilterContext.jsx
├── api/
│   └── client.js
├── utils/
│   ├── formatters.js
│   └── dateUtils.js
├── App.jsx
├── main.jsx
└── index.css
```

---

## Acceptance Criteria

### Header
- [ ] Owner dropdown filters all panels
- [ ] Date range dropdown updates data across all panels
- [ ] Sync status shows last successful sync time
- [ ] Refresh button triggers immediate data fetch

### KPI Bar
- [ ] Shows 4 KPI cards with current values
- [ ] Shows trend indicators (up/down arrows with delta)
- [ ] Respects owner and date filters

### Lead Overview
- [ ] Shows lead count per owner with trend
- [ ] Shows horizontal bar chart for status breakdown
- [ ] Shows horizontal bar chart for source breakdown
- [ ] All data respects global filters

### Campaign Performance
- [ ] Shows all campaigns in sortable table
- [ ] Calculates reply rate correctly
- [ ] Flags low-performing campaigns (< 10% reply rate)
- [ ] Sortable by any column
- [ ] Respects owner filter

### Task Tracker
- [ ] Groups tasks by Overdue, Today, Upcoming
- [ ] Shows correct icon per task type
- [ ] Shows relative due time
- [ ] Overdue section highlighted in red
- [ ] Shows task count badges per section
- [ ] Respects owner filter

### Meeting Tracker
- [ ] Shows conversion rate per owner as progress bars
- [ ] Shows team average with trend
- [ ] Lists upcoming meetings with details
- [ ] Lists recent meeting results with status icons
- [ ] Respects owner and date filters

### Performance
- [ ] Initial load < 2 seconds
- [ ] Filter changes reflect immediately (optimistic UI)
- [ ] Auto-refreshes every 5 minutes
- [ ] Shows loading states during fetch

---

## Rollout Plan

### Phase 1: Foundation (Day 1-2)
- [ ] Vite + React project setup
- [ ] Tailwind configuration
- [ ] API client setup
- [ ] React Query configuration
- [ ] Filter context
- [ ] Layout components (Header, Panel shell)

### Phase 2: KPIs + Leads (Day 3-4)
- [ ] KPIBar component
- [ ] KPICard component
- [ ] LeadOverview panel
- [ ] Bar charts with Recharts

### Phase 3: Campaigns + Tasks (Day 5-6)
- [ ] CampaignPerformance panel
- [ ] Sortable table
- [ ] TaskTracker panel
- [ ] Task grouping logic

### Phase 4: Meetings + Polish (Day 7-8)
- [ ] MeetingTracker panel
- [ ] Conversion rate visualization
- [ ] Loading states
- [ ] Error states
- [ ] Empty states

### Phase 5: Testing + Deploy (Day 9-10)
- [ ] Cross-browser testing
- [ ] Responsive tweaks (if needed)
- [ ] Performance audit
- [ ] Deploy to production

---

## Open Questions

1. **Drill-down:** Should clicking on a lead/campaign open a detail modal or link out to HubSpot/Lemlist?

2. **Real-time:** Is 5-minute refresh sufficient, or do we want websocket updates?

3. **Export:** Need CSV export of any data?

4. **Dark mode:** Required or nice-to-have?

5. **Custom date range:** Need date picker for custom ranges, or preset options sufficient?

---

## Appendix: API Response Examples

### GET /api/leads/summary
```json
{
  "total": 107,
  "by_owner": {
    "alec": { "count": 42, "delta_pct": 12 },
    "janae": { "count": 38, "delta_pct": -5 },
    "kate": { "count": 27, "delta_pct": 8 }
  },
  "by_status": {
    "new": 45,
    "enriched": 38,
    "in_sequence": 62,
    "converted": 14
  },
  "by_source": {
    "contact_us": 32,
    "ppc": 41,
    "lead_magnet": 28,
    "other": 6
  }
}
```

### GET /api/campaigns
```json
[
  {
    "id": "camp_123",
    "name": "Alec - Contact Us",
    "owner": "alec",
    "status": "active",
    "leads_count": 24,
    "emails_sent": 72,
    "emails_opened": 58,
    "emails_replied": 12,
    "open_rate": 0.806,
    "reply_rate": 0.167
  }
]
```

### GET /api/tasks
```json
[
  {
    "id": "task_456",
    "type": "email",
    "description": "Step 2 email",
    "lead_name": "John Smith",
    "lead_company": "Acme Corp",
    "owner": "alec",
    "due_at": "2026-02-04T16:00:00Z",
    "status": "pending"
  }
]
```

### GET /api/meetings
```json
[
  {
    "id": "mtg_789",
    "contact_name": "John Smith",
    "company": "Acme Corp",
    "owner": "alec",
    "scheduled_at": "2026-02-04T14:00:00Z",
    "status": "scheduled",
    "source_campaign": "Alec - Contact Us"
  }
]
```

### GET /api/meetings/stats
```json
{
  "total_meetings": 14,
  "total_leads_enrolled": 107,
  "conversion_rate": 0.131,
  "by_owner": {
    "alec": { "rate": 0.124, "meetings": 5, "leads": 40 },
    "janae": { "rate": 0.098, "meetings": 4, "leads": 41 },
    "kate": { "rate": 0.112, "meetings": 3, "leads": 27 }
  },
  "delta_vs_previous": 0.023
}
```

### GET /api/sync/status
```json
{
  "last_sync_at": "2026-02-04T13:45:00Z",
  "status": "success",
  "next_sync_at": "2026-02-04T13:50:00Z"
}
```
