const axios = require('axios');
const { buildUrl } = require('./ptvSign');

// Maps route_type to PTV disruption categories
const CATEGORIES = {
  0: ['metro_train', 'regional_train'],
  1: ['metro_tram'],
  2: ['metro_bus', 'regional_bus', 'night_bus']
};

async function getCommonAlerts(routeType = 0) {
  const url = buildUrl('/v3/disruptions');
  const res = await axios.get(url);
  const disruptions = res.data.disruptions || {};

  const categories = CATEGORIES[routeType] || CATEGORIES[0];
  const alerts = [];

  for (const cat of categories) {
    for (const d of (disruptions[cat] || [])) {
      const isDelay = /delay|late/i.test(d.disruption_type || '') ||
                      /delay|late/i.test(d.title || '');
      alerts.push({
        type: isDelay ? 'delay' : 'disruption',
        title: d.title,
        description: d.description || ''
      });
    }
  }

  return { alerts };
}

module.exports = { getCommonAlerts };
