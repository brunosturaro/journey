const axios = require('axios');

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

const FIELD_MASK = [
  'routes.legs.steps.transitDetails',
  'routes.legs.steps.travelMode',
  'routes.legs.duration',
  'routes.legs.distanceMeters',
  'routes.duration',
  'routes.distanceMeters'
].join(',');

async function getJourney(origin, destination) {
  const res = await axios.post(
    ROUTES_API_URL,
    {
      origin: { address: `${origin}, Melbourne, VIC, Australia` },
      destination: { address: `${destination}, Melbourne, VIC, Australia` },
      travelMode: 'TRANSIT',
      computeAlternativeRoutes: false
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK
      }
    }
  );

  const routes = res.data.routes;
  if (!routes || routes.length === 0) return null;

  const leg = routes[0].legs[0];

  const legs = leg.steps
    .filter(s => s.transitDetails)
    .map(s => {
      const td = s.transitDetails;
      return {
        mode: td.transitLine?.vehicle?.type || s.travelMode,
        line: td.transitLine?.name || td.transitLine?.nameShort || '—',
        line_short: td.transitLine?.nameShort || '',   // route number, e.g. "5", "78"
        headsign: td.headsign || '—',
        departure_stop: td.stopDetails?.departureStop?.name || '—',
        arrival_stop: td.stopDetails?.arrivalStop?.name || '—',
        departure_time: td.stopDetails?.departureTime || null,
        arrival_time: td.stopDetails?.arrivalTime || null,
        num_stops: td.stopCount || 0
      };
    });

  return {
    duration_seconds: Number(routes[0].duration?.replace('s', '') || 0),
    distance_meters: routes[0].distanceMeters || 0,
    total_legs: legs.length,
    legs
  };
}

module.exports = { getJourney };
