/**
 * API Configuration
 * Centralized config for the API server
 */

const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
    apiUrl: 'https://api.hubapi.com'
  },
  lemlist: {
    apiKey: process.env.LEMLIST_API_KEY,
    apiUrl: 'https://api.lemlist.com/api'
  },
  lemcal: {
    apiKey: process.env.LEMCAL_API_KEY
  },
  routing: {
    // HubSpot owner ID to name mapping
    owners: {
      '161405486': 'alec',
      '228077638': 'janae',
      '75344272': 'kate'
    }
  }
};

module.exports = { config };
