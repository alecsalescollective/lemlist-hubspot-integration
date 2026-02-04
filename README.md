# HubSpot-Lemlist Integration

A custom integration service that bridges HubSpot CRM and Lemlist outreach platform, enabling automated lead enrichment and intelligent sequence routing.

## Overview

This integration provides:

1. **Enrichment Pipeline** - Automatically enriches new leads using Lemlist's enrichment API
2. **Sequencing Pipeline** - Routes enriched leads to the appropriate Lemlist campaigns based on owner and lead source

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTEGRATION SERVICE                             │
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │             │    │             │    │             │    │             │  │
│  │  List       │───►│  Enrichment │───►│  Routing    │───►│  Sequence   │  │
│  │  Monitor    │    │  Engine     │    │  Engine     │    │  Enrollment │  │
│  │             │    │             │    │             │    │             │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                  │                  │                  │          │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │  HubSpot    │    │  Lemlist    │    │  Config     │    │  Lemlist    │
   │  Lists API  │    │  Enrich API │    │  (JSON)     │    │  Campaign   │
   └─────────────┘    └─────────────┘    └─────────────┘    │  API        │
                                                            └─────────────┘
```

## Prerequisites

Before running this integration, you need to set up:

### HubSpot Setup

1. **Create a Private App** with the following scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.lists.read`

2. **Create Custom Contact Properties**:
   - `enriched` (Single checkbox)
   - `lemlist_processing` (Single checkbox)
   - `lemlist_sequenced` (Single checkbox)
   - `lemlist_sequence_id` (Single-line text)
   - `lemlist_enrolled_at` (Date picker)
   - `enrichment_data` (Multi-line text)

3. **Create Lists** (6 total):
   - New Leads - Alec
   - New Leads - Janae
   - New Leads - Kate
   - Enriched Leads - Alec
   - Enriched Leads - Janae
   - Enriched Leads - Kate

4. **Create Workflows** to move contacts from "New Leads" to "Enriched Leads" lists when `enriched = yes`

### Lemlist Setup

1. Generate an API key from Lemlist settings
2. Create 9 campaigns (3 owners × 3 lead sources):
   - Alec - Contact Us, Lead Magnet, PPC
   - Janae - Contact Us, Lead Magnet, PPC
   - Kate - Contact Us, Lead Magnet, PPC

## Installation

```bash
# Clone the repository
git clone https://github.com/alecsalescollective/lemlist-hubspot-integration.git
cd lemlist-hubspot-integration

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

## Configuration

### Environment Variables

Edit `.env` with your credentials:

```bash
# HubSpot Configuration
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx
HUBSPOT_PORTAL_ID=12345678

# Lemlist Configuration
LEMLIST_API_KEY=xxxxxxxx

# Polling Configuration (default: 5 minutes)
POLLING_INTERVAL_MS=300000

# Deployment Date (only process leads after this date)
DEPLOYMENT_DATE=2026-02-03T00:00:00.000Z

# Email Alerts (optional)
ALERT_EMAIL_TO=alerts@yourcompany.com
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
```

### Routing Configuration

Edit `src/config/routing.json` with your actual HubSpot list IDs and Lemlist campaign IDs:

```json
{
  "lists": {
    "newLeads": [
      { "listId": "YOUR_LIST_ID", "owner": "alec" }
    ],
    "enrichedLeads": [
      { "listId": "YOUR_LIST_ID", "owner": "alec" }
    ]
  },
  "routing_rules": [
    {
      "owner": "alec",
      "sequences": {
        "contact_us": "YOUR_CAMPAIGN_ID",
        "lead_magnet": "YOUR_CAMPAIGN_ID",
        "ppc": "YOUR_CAMPAIGN_ID",
        "default": "YOUR_CAMPAIGN_ID"
      }
    }
  ]
}
```

## Usage

### Development

```bash
# Run with auto-reload
npm run dev
```

### Production

```bash
# Start the service
npm start
```

### Docker

```bash
# Build the image
docker build -t hubspot-lemlist-integration .

# Run the container
docker run -d \
  --name hubspot-lemlist \
  --env-file .env \
  hubspot-lemlist-integration
```

## How It Works

### Stage 1: Enrichment Pipeline

1. Polls HubSpot "New Leads" lists every 5 minutes (configurable)
2. Filters contacts where `enriched ≠ yes` AND `lemlist_processing ≠ true`
3. Sets `lemlist_processing = true` to prevent duplicate processing
4. Calls Lemlist enrichment API
5. Updates HubSpot with enrichment data
6. Sets `enriched = yes` and `lemlist_processing = false`

### Stage 2: Sequencing Pipeline

1. Polls HubSpot "Enriched Leads" lists every 5 minutes (offset from enrichment)
2. Filters contacts where `lemlist_sequenced ≠ yes`
3. Determines target campaign based on owner and `lead_source`
4. Checks if lead already exists in Lemlist (deduplication)
5. Adds lead to Lemlist campaign with custom variables
6. Updates HubSpot with `lemlist_sequenced = yes`

## Custom Variables

The following HubSpot fields are passed to Lemlist as custom variables for AI personalization:

- `hypothesis` - Free text about why the lead is a good fit
- `lead_magnet_downloaded` - Name of lead magnet if applicable
- `lead_source` - How the lead came in (contact_us, ppc, lead_magnet)

## Error Handling

- **Rate Limiting**: Respects HubSpot (100 req/10 sec) and Lemlist (100 req/min) limits
- **Retries**: Failed operations retry up to 3 times with exponential backoff
- **Email Alerts**: Sends alerts after 3 consecutive failures (if configured)
- **Graceful Degradation**: Individual failures don't halt pipeline processing

## Monitoring

Logs are output in JSON format for easy parsing. Key log events:

- `Starting enrichment pipeline run` - Pipeline triggered
- `Contact enriched successfully` - Individual success
- `Failed to enrich contact` - Individual failure
- `Enrichment pipeline run complete` - Run summary with counts

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Ensure all required variables are set in `.env`

2. **"Failed to connect to HubSpot API"**
   - Check your `HUBSPOT_ACCESS_TOKEN` is valid
   - Verify the Private App has required scopes

3. **"No campaign found for owner/leadSource"**
   - Update `routing.json` with valid campaign IDs
   - Ensure the `lead_source` value matches a routing rule

4. **Leads not being processed**
   - Check `DEPLOYMENT_DATE` - leads created before this date are skipped
   - Verify leads are in the correct HubSpot lists

## Project Structure

```
hubspot-lemlist-integration/
├── src/
│   ├── index.js                 # Entry point, cron scheduler
│   ├── config/
│   │   ├── index.js             # Config loader
│   │   └── routing.json         # Sequence routing rules
│   ├── services/
│   │   ├── hubspot.js           # HubSpot API client
│   │   ├── lemlist.js           # Lemlist API client
│   │   └── enrichment.js        # Enrichment orchestration
│   ├── pipelines/
│   │   ├── enrichmentPipeline.js
│   │   └── sequencingPipeline.js
│   └── utils/
│       ├── logger.js
│       ├── retry.js
│       ├── rateLimiter.js
│       └── emailAlert.js
├── tests/
├── .env.example
├── package.json
├── Dockerfile
└── README.md
```

## License

MIT
