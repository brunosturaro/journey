const axios = require('axios');
const { buildUrl } = require('./ptvSign');

const routeCache = new Map();

async function searchStop(name, routeType) {
  const term = name.split('/')[0].trim();
  const url = buildUrl(`/v3/search/${encodeURIComponent(term)}`);
  const res = await axios.get(url);
  const stops = res.data.stops || [];
  const stop = stops.find(s => s.route_type === routeType) || stops[0] || null;
  console.log(`[ptv] search "${term}" →`, stop ? `"${stop.stop_name}" id=${stop.stop_id}` : 'not found');
  return stop;
}

async function getDepartures(stopId, routeType) {
  const url = buildUrl(`/v3/departures/route_type/${routeType}/stop/${stopId}`, {
    max_results: 10
  });
  const res = await axios.get(url);
  return res.data.departures || [];
}

async function getRouteInfo(routeId) {
  if (routeCache.has(routeId)) return routeCache.get(routeId);
  try {
    const url = buildUrl(`/v3/routes/${routeId}`);
    const res = await axios.get(url);
    const info = {
      route_name: res.data.route?.route_name || '',
      route_number: res.data.route?.route_number || ''
    };
    routeCache.set(routeId, info);
    return info;
  } catch {
    return { route_name: '', route_number: '' };
  }
}

// origin      — stop name from Google Routes (e.g. "Princes St/Fitzroy St")
// routeType   — 0=train, 1=tram, 2=bus
// lineShort   — route number from Google (e.g. "5", "78")
// fromTime    — ISO string: show departures from this time onwards (defaults to now)
async function getPtvLeg(origin, routeType = 0, lineShort = '', fromTime = null) {
  const originStop = await searchStop(origin, routeType);
  if (!originStop) return { found: false, error: `Stop not found: "${origin}"` };

  const departures = await getDepartures(originStop.stop_id, routeType);

  // Fetch route info for every unique route_id in one parallel batch
  const uniqueRouteIds = [...new Set(departures.map(d => d.route_id))];
  await Promise.all(uniqueRouteIds.map(id => getRouteInfo(id)));

  const refMs  = fromTime ? new Date(fromTime).getTime() : Date.now();
  const nowMs  = Date.now();

  const results = departures
    .map(dep => {
      const scheduledMs = new Date(dep.scheduled_departure_utc).getTime();
      const minsUntil = Math.round((scheduledMs - nowMs) / 60000);
      const routeInfo = routeCache.get(dep.route_id) || { route_name: '', route_number: '' };
      return {
        route_id: dep.route_id,
        route_number: routeInfo.route_number,
        route_name: routeInfo.route_name,
        platform: dep.platform_number,
        scheduled_departure: dep.scheduled_departure_utc,
        real_time_departure: dep.estimated_departure_utc || null,
        mins_until: minsUntil,
        _scheduledMs: scheduledMs
      };
    })
    .filter(d => d._scheduledMs >= refMs - 60000)
    .sort((a, b) => a.mins_until - b.mins_until)
    .slice(0, 5)
    .map(({ _scheduledMs, ...d }) => d);

  console.log(`[ptv] "${originStop.stop_name}" (from ${fromTime || 'now'}) → ${results.length} departures:`, results.map(d => `${d.route_number} in ${d.mins_until}min`));

  return {
    found: true,
    origin_stop_id: originStop.stop_id,
    origin_stop: originStop.stop_name,
    primary_route_id: results[0]?.route_id || null,
    departures: results
  };
}

module.exports = { getPtvLeg };
