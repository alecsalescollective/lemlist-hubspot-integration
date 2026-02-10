const express = require('express');
const router = express.Router();
const axios = require('axios');
const dashboardService = require('../services/dashboardService');
const syncService = require('../services/syncService');

/**
 * GET /api/sync/status
 * Get sync status for all data types
 */
router.get('/status', async (req, res, next) => {
  try {
    const status = await dashboardService.getSyncStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sync/debug
 * Debug endpoint to check API connectivity
 * Optional: ?email=someone@example.com to look up specific contact
 */
router.get('/debug', async (req, res) => {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  const email = req.query.email;

  const debugInfo = {
    hubspot: {
      tokenPresent: !!token,
      tokenLength: token ? token.length : 0,
      tokenPrefix: token ? token.substring(0, 10) + '...' : null,
      tokenHasWhitespace: token ? (token !== token.trim()) : null
    },
    lemlist: {
      keyPresent: !!process.env.LEMLIST_API_KEY,
      keyLength: process.env.LEMLIST_API_KEY ? process.env.LEMLIST_API_KEY.length : 0
    },
    supabase: {
      urlPresent: !!process.env.SUPABASE_URL,
      keyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  };

  // Test HubSpot connectivity
  if (token) {
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json'
        }
      });
      debugInfo.hubspot.testResult = 'SUCCESS';
      debugInfo.hubspot.testStatus = response.status;
    } catch (error) {
      debugInfo.hubspot.testResult = 'FAILED';
      debugInfo.hubspot.testStatus = error.response?.status;
      debugInfo.hubspot.testError = error.response?.data?.message || error.message;
    }
  }

  // If email provided, look up that specific contact
  if (email && token) {
    try {
      const searchResponse = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email
            }]
          }],
          properties: ['email', 'firstname', 'lastname', 'add_to_lemlist', 'hubspot_owner_id', 'lifecyclestage', 'hs_email_optout'],
          limit: 1
        },
        {
          headers: {
            'Authorization': `Bearer ${token.trim()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (searchResponse.data.results?.length > 0) {
        debugInfo.contactLookup = {
          found: true,
          contact: searchResponse.data.results[0]
        };
      } else {
        debugInfo.contactLookup = { found: false, email };
      }
    } catch (error) {
      debugInfo.contactLookup = { error: error.response?.data || error.message };
    }
  }

  res.json(debugInfo);
});

/**
 * GET /api/sync/debug-contact?email=someone@example.com
 * Debug: Look up a specific contact by email
 */
router.get('/debug-contact', async (req, res) => {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  const email = req.query.email;

  if (!email) {
    return res.json({ error: 'Email query parameter required. Use ?email=someone@example.com' });
  }

  try {
    // Search for specific contact by email
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }],
        properties: ['email', 'firstname', 'lastname', 'add_to_lemlist', 'hubspot_owner_id', 'lifecyclestage', 'hs_email_optout'],
        limit: 1
      },
      {
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.results?.length > 0) {
      const contact = response.data.results[0];
      res.json({
        found: true,
        contact: {
          id: contact.id,
          properties: contact.properties
        }
      });
    } else {
      res.json({ found: false, email });
    }
  } catch (error) {
    res.json({
      error: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/sync/debug-contacts
 * Debug: List recent contacts with their add_to_lemlist values
 */
router.get('/debug-contacts', async (req, res) => {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  try {
    // Get recent contacts with the trigger field
    const response = await axios.get(
      'https://api.hubapi.com/crm/v3/objects/contacts?limit=20&properties=email,firstname,lastname,add_to_lemlist,hubspot_owner_id',
      {
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      total: response.data.total,
      contacts: response.data.results?.map(c => ({
        id: c.id,
        email: c.properties.email,
        name: `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim(),
        add_to_lemlist: c.properties.add_to_lemlist,
        ownerId: c.properties.hubspot_owner_id
      }))
    });
  } catch (error) {
    res.json({
      error: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/sync/debug-search
 * Debug: Test HubSpot search for triggered contacts
 */
router.get('/debug-search', async (req, res) => {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  const routingConfig = require('../config/routing.json');

  const triggerField = routingConfig.trigger_field;
  const triggerValue = routingConfig.trigger_value;

  try {
    // Search for contacts with trigger field set
    const searchResponse = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        filterGroups: [{
          filters: [{
            propertyName: triggerField,
            operator: 'EQ',
            value: triggerValue
          }]
        }],
        properties: ['email', 'firstname', 'lastname', triggerField, 'hubspot_owner_id'],
        limit: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      config: { triggerField, triggerValue },
      searchResults: searchResponse.data.total,
      contacts: searchResponse.data.results?.map(c => ({
        id: c.id,
        email: c.properties.email,
        name: `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim(),
        triggerFieldValue: c.properties[triggerField],
        ownerId: c.properties.hubspot_owner_id
      }))
    });
  } catch (error) {
    res.json({
      config: { triggerField, triggerValue },
      error: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/sync/debug-lemlist-reports
 * Debug: Show raw Lemlist campaign report data
 */
router.get('/debug-lemlist-reports', async (req, res) => {
  try {
    const LemlistClient = require('../clients/lemlist');
    const { config } = require('../config');
    const lemlist = new LemlistClient(config.lemlist);

    const campaigns = await lemlist.getCampaigns();
    const inboundCampaigns = campaigns.filter(c =>
      c.name?.toLowerCase().includes('inbound')
    );

    const campaignIds = inboundCampaigns.map(c => c._id);
    let reports = [];
    try {
      reports = await lemlist.getCampaignReports(campaignIds);
    } catch (e) {
      reports = [{ error: e.message }];
    }

    // Also try per-campaign stats
    const statsResults = {};
    for (const cid of campaignIds) {
      try {
        statsResults[cid] = await lemlist.getCampaignStats(cid);
      } catch (e) {
        statsResults[cid] = { error: e.message };
      }
    }

    res.json({
      campaigns: inboundCampaigns.map(c => ({ _id: c._id, name: c.name })),
      reports,
      perCampaignStats: statsResults
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

/**
 * POST /api/sync/backfill-sources
 * Backfill source_detail from HubSpot for leads missing it
 */
router.post('/backfill-sources', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const token = process.env.HUBSPOT_ACCESS_TOKEN;

    // Get leads missing source_detail
    const { data: leads, error } = await supabase
      .from('processed_leads')
      .select('contact_id, email, source_detail')
      .is('source_detail', null);

    if (error) throw error;
    if (!leads || leads.length === 0) {
      return res.json({ message: 'No leads missing source_detail', updated: 0 });
    }

    let updated = 0;
    const results = [];

    for (const lead of leads) {
      if (!lead.contact_id) continue;

      try {
        // Look up contact in HubSpot by ID
        const response = await axios.get(
          `https://api.hubapi.com/crm/v3/objects/contacts/${lead.contact_id}`,
          {
            params: { properties: 'hs_object_source_detail_1,email' },
            headers: {
              'Authorization': `Bearer ${token.trim()}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const sourceDetail = response.data?.properties?.hs_object_source_detail_1;

        if (sourceDetail) {
          await supabase
            .from('processed_leads')
            .update({ source_detail: sourceDetail })
            .eq('contact_id', lead.contact_id);

          updated++;
          results.push({ email: lead.email, sourceDetail });
        } else {
          results.push({ email: lead.email, sourceDetail: null, note: 'No source_detail in HubSpot' });
        }
      } catch (err) {
        results.push({ email: lead.email, error: err.response?.status || err.message });
      }
    }

    res.json({ message: `Backfilled ${updated} of ${leads.length} leads`, updated, total: leads.length, results });
  } catch (error) {
    res.json({ error: error.message });
  }
});

/**
 * POST /api/sync/trigger
 * Manually trigger a sync for all data types
 */
router.post('/trigger', async (req, res, next) => {
  try {
    const { type = 'all' } = req.body;

    // Start sync in background
    const result = await syncService.triggerSync(type);

    res.json({
      message: 'Sync triggered successfully',
      type,
      result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
