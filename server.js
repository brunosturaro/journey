require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
const cors = require('cors');
const { getStop, getDepartures, getRoute } = require('./services/ptv');
const { getAlertsFromDeparture } = require('./services/alerts');
const { getJourney } = require('./services/journey');
const { getPtvLeg } = require('./services/ptvLeg');
const { getCommonAlerts } = require('./services/commonAlerts');
const { getTargetPlaces } = require('./services/places');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { v4: uuidv4, validate: uuidValidate } = require('uuid');
const authRoutes    = require('./routes/auth');
const favoritesRoutes = require('./routes/favorites');
const apiKeysRoutes = require('./routes/apiKeys');
const apiKeyMiddleware = require('./middleware/apiKey');

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ptv', { family: 4 })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection failed:', err.message));

const app = express();

// CORS — only allow requests from known origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, server-to-server) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Auth, Favorites & API Keys routes
app.use('/auth', authRoutes);
app.use('/favorites', favoritesRoutes);
app.use('/api-keys', apiKeysRoutes);

// GET /board/:stop_id?route_type=0
app.get('/board/:stop_id', apiKeyMiddleware, async (req, res) => {
  const stopId = Number(req.params.stop_id);
  const routeType = Number(req.query.route_type ?? 0);

  try {
    const [stop, departures] = await Promise.all([
      getStop(stopId, routeType),
      getDepartures(stopId, routeType)
    ]);

    const enriched = await Promise.all(departures.map(async (dep) => {
      const route = await getRoute(dep.route_id);
      const scheduledMs = new Date(dep.scheduled_departure_utc).getTime();
      const estimatedMs = new Date(dep.estimated_departure_utc).getTime();
      const delayMinutes = Math.round((estimatedMs - scheduledMs) / 60000);

      return {
        route_name: route.route_name,
        route_type: route.route_type,
        platform: dep.platform_number,
        scheduled_departure: dep.scheduled_departure_utc,
        estimated_departure: dep.estimated_departure_utc,
        delay_minutes: delayMinutes,
        on_time: delayMinutes <= 0
      };
    }));

    const alerts = [];

    res.json({
      stop: {
        stop_id: stop.stop_id,
        stop_name: stop.stop_name,
        suburb: stop.stop_suburb
      },
      departures: enriched,
      alerts
    });
  } catch (err) {
    const status = err.response?.status;
    if (status === 403 || status === 404) {
      return res.status(404).json({ error: `Stop ${req.params.stop_id} not found on PTV for route_type ${req.query.route_type ?? 0}` });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /ptv-test
app.get('/ptv-test', async (req, res) => {
  const { buildUrl } = require('./services/ptvSign');
  const url = buildUrl('/v3/route_types');
  console.log('[ptv-test] calling:', url);
  try {
    const r = await axios.get(url);
    res.json(r.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// GET /uuid/generate
app.get('/uuid/generate', (req, res) => {
  res.json({ uuid: uuidv4() });
});

// GET /uuid/validate
app.get('/uuid/validate', (req, res) => {
  const uuid = req.headers['x-uuid'];
  if (!uuid) return res.status(400).json({ error: 'Missing x-uuid header' });
  const valid = uuidValidate(uuid);
  res.json({ uuid, valid });
});

// GET /config
app.get('/config', (req, res) => {
  res.json({ mapsApiKey: process.env.GOOGLE_MAPS_API_KEY });
});

// GET /reverse-geocode?lat=...&lng=...
app.get('/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });
  try {
    const r = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { latlng: `${lat},${lng}`, key: process.env.GOOGLE_MAPS_API_KEY, language: 'en' }
    });
    const result = r.data.results[0];
    if (!result) return res.status(404).json({ error: 'No address found' });
    res.json({ address: result.formatted_address });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /autocomplete?input=...
app.get('/autocomplete', async (req, res) => {
  const { input } = req.query;
  if (!input) return res.json({ suggestions: [] });

  try {
    const r = await axios.get(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json',
      {
        params: {
          input,
          key: process.env.GOOGLE_MAPS_API_KEY,
          components: 'country:au',
          location: '-37.8136,144.9631',
          radius: 50000,
          language: 'en'
        }
      }
    );
    const suggestions = (r.data.predictions || []).map(p => ({
      text: p.description,
      placeId: p.place_id
    }));
    res.json({ suggestions });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[autocomplete]', JSON.stringify(detail));
    res.status(500).json({ error: detail });
  }
});

// GET /target-places?destination=...&categories=coffee,hotel,restaurant
app.get('/target-places', async (req, res) => {
  const { destination, categories } = req.query;
  if (!destination) return res.status(400).json({ error: 'destination is required' });

  try {
    const result = await getTargetPlaces(destination, categories, process.env.GOOGLE_MAPS_API_KEY);
    if (!result) return res.status(404).json({ error: 'Destination could not be located' });
    res.json(result);
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[target-places]', JSON.stringify(detail));
    res.status(500).json({ error: detail });
  }
});

// GET /journey?origin=...&destination=...
app.get('/journey', async (req, res) => {
  const { origin, destination } = req.query;
  if (!origin || !destination) {
    return res.status(400).json({ error: 'origin and destination are required' });
  }

  try {
    const journey = await getJourney(origin, destination);
    if (!journey) return res.status(404).json({ error: 'No route found' });

    const ROUTE_TYPE = { HEAVY_RAIL: 0, COMMUTER_TRAIN: 0, RAIL: 0, TRAM: 1, BUS: 2 };

    const enrichedLegs = await Promise.all(journey.legs.map(async (leg) => {
      const routeType = ROUTE_TYPE[leg.mode] ?? 0;
      const ptv = await getPtvLeg(leg.departure_stop, routeType, leg.line_short, leg.departure_time).catch(err => {
        console.error('[ptv error]', err.response?.data || err.message);
        return { found: false };
      });
      if (ptv?.departures) {
        ptv.departures = ptv.departures.map(dep => ({
          ...dep,
          delay: getAlertsFromDeparture(dep.real_time_departure, dep.scheduled_departure)[0] || null
        }));
      }
      return { ...leg, ptv };
    }));

    res.json({ ...journey, legs: enrichedLegs });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[journey]', JSON.stringify(detail));
    res.status(500).json({ error: detail });
  }
});

// GET /common-alerts?route_type=0
app.get('/common-alerts', apiKeyMiddleware, async (req, res) => {
  const routeType = Number(req.query.route_type ?? 0);
  try {
    const { alerts } = await getCommonAlerts(routeType);
    res.json({
      generated_at: new Date().toISOString(),
      route_type: routeType,
      alert_count: alerts.length,
      alerts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /ptv-leg?origin=...&destination=...&route_type=0
app.get('/ptv-leg', apiKeyMiddleware, async (req, res) => {
  const { origin, destination, route_type } = req.query;
  if (!origin || !destination) {
    return res.status(400).json({ error: 'origin and destination are required' });
  }
  try {
    const result = await getPtvLeg(origin, Number(route_type ?? 0));
    if (result.error) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch (err) {
    const detail = err.response?.data || err.message;
    res.status(500).json({ error: detail });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Departure Board running at http://localhost:${PORT}`);
  console.log(`Google API Key: ${process.env.GOOGLE_MAPS_API_KEY ? '✓ loaded' : '✗ MISSING'}`);
  console.log(`JWT Secret: ${process.env.JWT_SECRET ? '✓ loaded' : '✗ MISSING'}`);
});
