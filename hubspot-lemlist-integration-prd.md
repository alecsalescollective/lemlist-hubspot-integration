# Product Requirements Document: HubSpot-Lemlist Custom Integration

**Document Version:** 1.0  
**Created:** February 3, 2026  
**Author:** Alec  
**Status:** Draft  

---

## Executive Summary

This document outlines the requirements for a custom integration between HubSpot CRM and Lemlist outreach platform. The integration enables automated lead enrichment and intelligent sequence routing while maintaining the existing Salesforce-HubSpot native integration. Because Lemlist only allows one native CRM integration at a time (currently allocated to Salesforce), this custom solution bridges HubSpot and Lemlist via their respective APIs.

---

## Problem Statement

The sales team (Alec, Janae, Kate) currently lacks automated lead processing between HubSpot and Lemlist. New leads entering HubSpot require manual enrichment and manual addition to outreach sequences. This creates delays in response time, inconsistent data quality, and prevents the team from leveraging Lemlist's AI-powered dynamic messaging capabilities with enriched lead data.

**Current Pain Points:**
- Manual lead enrichment is time-consuming and inconsistent
- Leads sit in queues before outreach begins
- No automated routing based on lead source or owner
- Dynamic fields (hypothesis, lead magnet) aren't being leveraged for personalization
- Native Lemlist-HubSpot integration unavailable due to Salesforce integration constraint

---

## Goals & Success Metrics

### Primary Goals
1. Automate lead enrichment for all new leads entering designated HubSpot lists
2. Automate sequence enrollment based on owner assignment and lead source
3. Pass dynamic context fields to Lemlist for AI-powered message personalization
4. Maintain data integrity and prevent duplicate processing

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Lead processing time | < 15 minutes from list entry to sequence enrollment | Timestamp comparison |
| Enrichment completion rate | > 95% of leads successfully enriched | Lemlist API success rate |
| Sequence enrollment accuracy | 100% routed to correct sequence | Audit log review |
| System uptime | 99.5% | Monitoring alerts |
| Duplicate prevention | 0 duplicate enrollments | Lemlist deduplication check |

---

## User Stories

### Sales Rep (Alec, Janae, Kate)
- As a sales rep, I want new leads automatically enriched so I have complete prospect data without manual research.
- As a sales rep, I want leads automatically added to the correct sequence based on how they came in so outreach starts immediately.
- As a sales rep, I want my leads routed only to my sequences so I maintain ownership and personalization.

### Sales Operations / Admin
- As an admin, I want to configure routing rules without code changes so I can adapt to new lead sources.
- As an admin, I want visibility into processing status so I can troubleshoot failures.
- As an admin, I want to add new team members and sequences without rebuilding the integration.

---

## System Architecture

### High-Level Flow

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

### Two-Stage Processing

**Stage 1: Enrichment Pipeline**
```
HubSpot "New Leads" List (per owner)
            │
            ▼
    Poll for new contacts
    (filter: enriched ≠ yes AND lemlist_processing ≠ true)
            │
            ▼
    Set lemlist_processing = true (lock)
            │
            ▼
    Call Lemlist Enrichment API
            │
            ▼
    Update HubSpot contact:
    - enriched = yes
    - enrichment_data = {JSON}
    - lemlist_processing = false
            │
            ▼
    HubSpot workflow moves to "Enriched Leads" list
```

**Stage 2: Sequence Enrollment Pipeline**
```
HubSpot "Enriched Leads" List (per owner)
            │
            ▼
    Poll for new contacts
    (filter: lemlist_sequenced ≠ yes)
            │
            ▼
    Determine target sequence:
    - Owner (from list membership)
    - Lead Source (HubSpot field)
            │
            ▼
    Build Lemlist lead payload:
    - Standard fields (name, email, company)
    - Dynamic fields (hypothesis, lead_magnet, etc.)
            │
            ▼
    Add lead to Lemlist campaign via API
            │
            ▼
    Update HubSpot:
    - lemlist_sequenced = yes
    - lemlist_sequence_id = {id}
    - lemlist_enrolled_at = {timestamp}
```

---

## Functional Requirements

### FR-1: List Monitoring

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | System shall poll HubSpot lists at configurable intervals (default: 5 minutes) | P0 |
| FR-1.2 | System shall monitor 6 distinct lists (3 "New Leads" + 3 "Enriched Leads") | P0 |
| FR-1.3 | System shall identify new contacts by checking processing status fields | P0 |
| FR-1.4 | System shall support adding new lists without code deployment | P1 |
| FR-1.5 | System shall handle HubSpot API rate limits gracefully (100 requests/10 seconds) | P0 |

### FR-2: Lead Enrichment

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | System shall call Lemlist enrichment API for each new lead | P0 |
| FR-2.2 | System shall store enrichment results in HubSpot custom properties | P0 |
| FR-2.3 | System shall mark contacts as enriched upon successful API response | P0 |
| FR-2.4 | System shall retry failed enrichments up to 3 times with exponential backoff | P0 |
| FR-2.5 | System shall log enrichment failures for manual review | P0 |

### FR-3: Sequence Routing

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | System shall route leads based on owner (derived from list membership) | P0 |
| FR-3.2 | System shall route leads based on lead_source field | P0 |
| FR-3.3 | System shall support configurable routing rules via JSON config | P1 |
| FR-3.4 | System shall default to a fallback sequence if no routing rule matches | P0 |
| FR-3.5 | System shall support future routing criteria (industry, company size, etc.) | P2 |

### FR-4: Lemlist Enrollment

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | System shall add leads to Lemlist campaigns via API | P0 |
| FR-4.2 | System shall pass standard fields: email, firstName, lastName, companyName | P0 |
| FR-4.3 | System shall pass dynamic fields: hypothesis, lead_magnet_downloaded, lead_source | P0 |
| FR-4.4 | System shall support custom variable mapping (HubSpot field → Lemlist variable) | P1 |
| FR-4.5 | System shall prevent duplicate enrollment (check Lemlist before adding) | P0 |
| FR-4.6 | System shall record enrollment metadata back to HubSpot | P0 |

### FR-5: Error Handling & Logging

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | System shall log all API calls with request/response details | P0 |
| FR-5.2 | System shall alert on consecutive failures (>3 in a row) | P1 |
| FR-5.3 | System shall maintain an error queue for failed operations | P1 |
| FR-5.4 | System shall provide a manual retry mechanism for failed leads | P2 |
| FR-5.5 | System shall not halt processing due to individual lead failures | P0 |

---

## Data Model

### HubSpot Custom Properties (Contact Level)

| Property Name | Internal Name | Type | Description |
|---------------|---------------|------|-------------|
| Enriched | `enriched` | Single checkbox | Indicates lead has been enriched |
| Lemlist Processing | `lemlist_processing` | Single checkbox | Lock field to prevent duplicate processing |
| Lemlist Sequenced | `lemlist_sequenced` | Single checkbox | Indicates lead has been added to sequence |
| Lemlist Sequence ID | `lemlist_sequence_id` | Single-line text | ID of the Lemlist campaign |
| Lemlist Enrolled At | `lemlist_enrolled_at` | Date picker | Timestamp of sequence enrollment |
| Enrichment Data | `enrichment_data` | Multi-line text | JSON blob of enrichment results |
| Lead Source | `lead_source` | Dropdown | Source of the lead (Contact Us, PPC, Lead Magnet, etc.) |
| Hypothesis | `hypothesis` | Multi-line text | Free text hypothesis for AI personalization |
| Lead Magnet Downloaded | `lead_magnet_downloaded` | Single-line text | Name of lead magnet if applicable |

### HubSpot Lists

| List Name | List ID | Stage | Owner |
|-----------|---------|-------|-------|
| New Leads - Alec | TBD | Enrichment | Alec |
| New Leads - Janae | TBD | Enrichment | Janae |
| New Leads - Kate | TBD | Enrichment | Kate |
| Enriched Leads - Alec | TBD | Sequencing | Alec |
| Enriched Leads - Janae | TBD | Sequencing | Janae |
| Enriched Leads - Kate | TBD | Sequencing | Kate |

### Lemlist Campaigns (Sequences)

| Campaign Name | Campaign ID | Owner | Lead Source |
|---------------|-------------|-------|-------------|
| Alec - Contact Us | TBD | Alec | contact_us |
| Alec - Lead Magnet | TBD | Alec | lead_magnet |
| Alec - PPC | TBD | Alec | ppc |
| Janae - Contact Us | TBD | Janae | contact_us |
| Janae - Lead Magnet | TBD | Janae | lead_magnet |
| Janae - PPC | TBD | Janae | ppc |
| Kate - Contact Us | TBD | Kate | contact_us |
| Kate - Lead Magnet | TBD | Kate | lead_magnet |
| Kate - PPC | TBD | Kate | ppc |

### Routing Configuration Schema

```json
{
  "routing_rules": [
    {
      "list_id": "hubspot_list_id_alec_enriched",
      "owner": "alec",
      "sequences": {
        "contact_us": "lemlist_campaign_id_1",
        "lead_magnet": "lemlist_campaign_id_2",
        "ppc": "lemlist_campaign_id_3",
        "default": "lemlist_campaign_id_1"
      }
    },
    {
      "list_id": "hubspot_list_id_janae_enriched",
      "owner": "janae",
      "sequences": {
        "contact_us": "lemlist_campaign_id_4",
        "lead_magnet": "lemlist_campaign_id_5",
        "ppc": "lemlist_campaign_id_6",
        "default": "lemlist_campaign_id_4"
      }
    },
    {
      "list_id": "hubspot_list_id_kate_enriched",
      "owner": "kate",
      "sequences": {
        "contact_us": "lemlist_campaign_id_7",
        "lead_magnet": "lemlist_campaign_id_8",
        "ppc": "lemlist_campaign_id_9",
        "default": "lemlist_campaign_id_7"
      }
    }
  ],
  "field_mappings": {
    "email": "email",
    "firstName": "firstname",
    "lastName": "lastname",
    "companyName": "company",
    "hypothesis": "hypothesis",
    "leadMagnet": "lead_magnet_downloaded",
    "leadSource": "lead_source"
  }
}
```

---

## API Specifications

### HubSpot API

**Authentication:** Private App Access Token  
**Base URL:** `https://api.hubapi.com`  
**Rate Limits:** 100 requests per 10 seconds

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/crm/v3/lists/{listId}/memberships` | GET | Get contacts in a list |
| `/crm/v3/objects/contacts/{contactId}` | GET | Get contact properties |
| `/crm/v3/objects/contacts/{contactId}` | PATCH | Update contact properties |
| `/crm/v3/objects/contacts/batch/read` | POST | Batch read contacts |
| `/crm/v3/objects/contacts/batch/update` | POST | Batch update contacts |

### Lemlist API

**Authentication:** API Key (header: `X-Api-Key`)  
**Base URL:** `https://api.lemlist.com/api`  
**Rate Limits:** 100 requests per minute

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/campaigns` | GET | List all campaigns |
| `/campaigns/{campaignId}/leads` | POST | Add lead to campaign |
| `/campaigns/{campaignId}/leads/{email}` | GET | Check if lead exists |
| `/enrichment/find` | POST | Enrich a lead (email-based) |

### Lemlist Lead Payload

```json
{
  "email": "prospect@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Corp",
  "customVariables": {
    "hypothesis": "They're hiring 3 sales reps, scaling outbound",
    "leadMagnet": "Cold Email Playbook",
    "leadSource": "lead_magnet"
  }
}
```

---

## Non-Functional Requirements

### Performance

| Requirement | Target |
|-------------|--------|
| Polling interval | Configurable, default 5 minutes |
| Lead processing throughput | 100 leads per polling cycle |
| API response timeout | 30 seconds |
| End-to-end processing time | < 15 minutes from list entry to sequence |

### Reliability

| Requirement | Target |
|-------------|--------|
| System uptime | 99.5% |
| Data consistency | 100% (no orphaned states) |
| Retry policy | 3 retries with exponential backoff |
| Graceful degradation | Continue processing on individual failures |

### Security

| Requirement | Implementation |
|-------------|----------------|
| API key storage | Environment variables / secrets manager |
| Data in transit | HTTPS only |
| Access logging | All API calls logged with timestamps |
| PII handling | No PII stored in logs |

### Scalability

| Requirement | Target |
|-------------|--------|
| Team members supported | 10+ without code changes |
| Leads per day | 500+ |
| Concurrent API calls | Rate-limit aware queuing |

---

## Technical Implementation

### Recommended Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Node.js 20 LTS | Excellent async handling, strong API ecosystem |
| Framework | Express.js (optional) | Lightweight, only if admin UI needed |
| Scheduling | node-cron | Simple, reliable polling |
| HTTP Client | axios | Clean API, interceptors for retry logic |
| Logging | pino | Fast, structured JSON logging |
| Configuration | dotenv + JSON | Environment secrets + routing config |
| Hosting | DigitalOcean App Platform | Simple deployment, auto-scaling |

### Project Structure

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
│   ├── utils/
│   │   ├── logger.js
│   │   ├── retry.js
│   │   └── rateLimiter.js
│   └── types/
│       └── index.d.ts           # TypeScript definitions (optional)
├── tests/
│   ├── hubspot.test.js
│   ├── lemlist.test.js
│   └── pipelines.test.js
├── .env.example
├── package.json
├── README.md
└── Dockerfile
```

### Environment Variables

```bash
# HubSpot
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx
HUBSPOT_PORTAL_ID=12345678

# Lemlist
LEMLIST_API_KEY=xxxxxxxx

# App Config
POLLING_INTERVAL_MS=300000
LOG_LEVEL=info
NODE_ENV=production
```

---

## Rollout Plan

### Phase 1: Foundation (Week 1)
- [ ] Set up project scaffolding and repository
- [ ] Implement HubSpot API client with authentication
- [ ] Implement Lemlist API client with authentication
- [ ] Create HubSpot custom properties
- [ ] Create HubSpot lists (6 total)
- [ ] Unit tests for API clients

### Phase 2: Enrichment Pipeline (Week 2)
- [ ] Implement list polling for "New Leads" lists
- [ ] Implement enrichment orchestration
- [ ] Implement HubSpot field updates
- [ ] Error handling and retry logic
- [ ] Integration tests for enrichment flow

### Phase 3: Sequencing Pipeline (Week 3)
- [ ] Implement list polling for "Enriched Leads" lists
- [ ] Implement routing logic with config
- [ ] Implement Lemlist campaign enrollment
- [ ] Implement deduplication checks
- [ ] Integration tests for sequencing flow

### Phase 4: Production Deployment (Week 4)
- [ ] Create Lemlist campaigns (9 total)
- [ ] Populate routing configuration with real IDs
- [ ] Deploy to DigitalOcean
- [ ] Configure monitoring and alerts
- [ ] Run end-to-end tests with test leads
- [ ] Go live with Alec's lists first (pilot)

### Phase 5: Full Rollout (Week 5)
- [ ] Enable Janae's lists
- [ ] Enable Kate's lists
- [ ] Monitor and tune performance
- [ ] Document runbook and troubleshooting guide

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API rate limits exceeded | Processing delays | Medium | Implement queue with rate limiting |
| Lemlist enrichment API unavailable | Leads stuck in Stage 1 | Low | Retry logic + alerting + manual fallback |
| Duplicate sequence enrollment | Poor prospect experience | Medium | Pre-check Lemlist + HubSpot flag |
| HubSpot workflow conflicts | Leads not moving to correct lists | Low | Document required workflows clearly |
| Team member added/removed | Routing breaks | Medium | Config-driven, easy to update |

---

## Open Questions

1. **Enrichment scope:** What specific data points should we capture from Lemlist enrichment and store in HubSpot?

2. **Failure notifications:** Should failures trigger Slack alerts, email, or both?

3. **Historical backfill:** Do existing leads in the lists need to be processed, or only new additions?

4. **Sequence timing:** Should leads be enrolled immediately, or is there a preferred time window (e.g., business hours)?

5. **Additional routing criteria:** Beyond owner and lead_source, are there other fields that should influence sequence selection in V1?

6. **Admin dashboard:** Is a simple web UI needed to view processing status and retry failures, or is logging sufficient?

---

## Appendix

### A. HubSpot Workflow Requirements

The following HubSpot workflows must be created (native HubSpot, not part of this integration):

**Workflow 1: Move to Enriched List (per owner)**
- Trigger: Contact property `enriched` is equal to `yes`
- Action: Add to static list "Enriched Leads - {Owner}"
- Note: Create 3 versions, one per owner

### B. Glossary

| Term | Definition |
|------|------------|
| Enrichment | Process of augmenting lead data with additional information (company size, social profiles, etc.) |
| Sequence | Automated multi-step outreach campaign in Lemlist |
| Hypothesis | Free-text field containing contextual intelligence about why a lead might be a good fit |
| Lead Source | Channel through which the lead entered the system (Contact Us, PPC, Lead Magnet, etc.) |

### C. Reference Links

- [HubSpot CRM API Documentation](https://developers.hubspot.com/docs/api/crm/contacts)
- [HubSpot Lists API Documentation](https://developers.hubspot.com/docs/api/crm/lists)
- [Lemlist API Documentation](https://developer.lemlist.com/)

---

**Document Approval**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Technical Lead | | | |
| Sales Lead | | | |
