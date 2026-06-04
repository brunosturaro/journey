const axios = require('axios');

// Classmate's API — set ALERTS_URL in .env with his ngrok URL.
// Endpoint used: GET /train-status/:routeId
// Response: { route_name, status, delay_minutes, alerts: [string, ...] }

const ALERTS_URL = process.env.ALERTS_URL || 'http://localhost:3001';

async function getAlerts(routeId) {
  if (!routeId) return [];
  try {
    const res = await axios.get(`${ALERTS_URL}/train-status/${routeId}`);
    const data = res.data;
    const alerts = [];

    // delay from classmate
    if (data.delay_minutes > 0) {
      alerts.push({
        type: 'delay',
        title: `${data.route_name} — ${data.delay_minutes} min delay`,
        description: data.status
      });
    }

    // disruption alerts — skip placeholders and routine/info messages
    (data.alerts || [])
      .filter(a => a !== 'No maintenance alerts.')
      .filter(a => !a.includes('ROUTINE ALERT') && !a.includes('[INFO]'))
      .forEach(a => alerts.push({ type: 'disruption', title: a }));

    console.log(`[alerts] route ${routeId} (${data.route_name}) → ${alerts.length} alert(s) from classmate`);
    return alerts;
  } catch (err) {
    console.log(`[alerts] route ${routeId} → classmate unreachable (${err.message})`);
    return [];
  }
}

module.exports = { getAlerts };
