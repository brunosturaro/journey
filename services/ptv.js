const axios = require('axios');
const { buildUrl } = require('./ptvSign');

async function getStop(stopId, routeType = 0) {
  const url = buildUrl(`/v3/stops/${stopId}/route_type/${routeType}`);
  const res = await axios.get(url);
  return res.data.stop;
}

async function getDepartures(stopId, routeType = 0) {
  const url = buildUrl(`/v3/departures/route_type/${routeType}/stop/${stopId}`);
  const res = await axios.get(url);
  return res.data.departures;
}

async function getRoute(routeId) {
  const url = buildUrl(`/v3/routes/${routeId}`);
  const res = await axios.get(url);
  return res.data.route;
}

module.exports = { getStop, getDepartures, getRoute };
