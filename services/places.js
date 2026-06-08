const axios = require('axios');

const CATEGORY_MAP = {
  coffee:     { label: 'Coffee', type: 'cafe', keyword: 'coffee' },
  restaurant: { label: 'Restaurant', type: 'restaurant' },
  food:       { label: 'Food', type: 'restaurant', keyword: 'food' },
  bar:        { label: 'Bar', type: 'bar' },
  'night club': { label: 'Night Club', type: 'night_club' },
  museum:     { label: 'Museum', type: 'museum' },
  hotel:      { label: 'Hotel', type: 'lodging' },
  lodging:    { label: 'Lodging', type: 'lodging' },
  hospital:   { label: 'Hospital', type: 'hospital' },
  'public toilet': { label: 'Public toilet', keyword: 'public toilet' }
};

const DEFAULT_CATEGORIES = [
  'coffee',
  'restaurant',
  'hotel',
  'public toilet',
  'hospital',
  'bar',
  'night club',
  'museum'
];

const GOOGLE_FIND_PLACE_URL = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';
const GOOGLE_NEARBY_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

async function geocodeDestination(destination, apiKey) {
  const response = await axios.get(GOOGLE_FIND_PLACE_URL, {
    params: {
      input: destination,
      inputtype: 'textquery',
      fields: 'formatted_address,geometry,place_id',
      key: apiKey,
      language: 'en'
    }
  });

  const result = response.data.candidates?.[0];
  if (!result) return null;
  return {
    address: result.formatted_address,
    location: result.geometry.location,
    placeId: result.place_id
  };
}

function getDistanceMeters(a, b) {
  const toRad = degrees => degrees * Math.PI / 180;
  const lat1 = a.lat;
  const lon1 = a.lng;
  const lat2 = b.lat;
  const lon2 = b.lng;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rad = 6371000; // Earth radius in meters
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const hav = sinLat * sinLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return Math.round(rad * c);
}

async function nearbyPlaces({ location, category, apiKey, radius = 500, limit = 5 }) {
  const categoryMeta = CATEGORY_MAP[category];
  if (!categoryMeta) return { category, label: category, places: [] };

  const params = {
    key: apiKey,
    location: `${location.lat},${location.lng}`,
    radius,
    language: 'en'
  };

  if (categoryMeta.type) params.type = categoryMeta.type;
  if (categoryMeta.keyword) params.keyword = categoryMeta.keyword;
  if (categoryMeta.type && categoryMeta.keyword && category === 'coffee') {
    params.keyword = categoryMeta.keyword;
  }

  const response = await axios.get(GOOGLE_NEARBY_SEARCH_URL, { params });
  const results = response.data.results || [];

  const filtered = results
    .map(place => {
      const placeLocation = place.geometry?.location || null;
      const distance_meters = placeLocation ? getDistanceMeters(location, placeLocation) : null;
      return {
        raw: place,
        placeLocation,
        distance_meters
      };
    })
    .filter(item => item.distance_meters !== null && item.distance_meters <= radius)
    .sort((a, b) => a.distance_meters - b.distance_meters)
    .slice(0, limit);

  return {
    category,
    label: categoryMeta.label,
    places: filtered.map(item => ({
      category,
      name: item.raw.name,
      address: item.raw.vicinity || item.raw.formatted_address || null,
      place_id: item.raw.place_id,
      location: item.placeLocation,
      rating: item.raw.rating ?? null,
      user_ratings_total: item.raw.user_ratings_total ?? null,
      types: item.raw.types || [],
      open_now: item.raw.opening_hours?.open_now ?? null,
      business_status: item.raw.business_status || null,
      distance_meters: item.distance_meters,
      walking_minutes: Math.max(1, Math.round(item.distance_meters / 83.33))
    }))
  };
}

function normalizeCategories(input) {
  if (!input) return DEFAULT_CATEGORIES;
  const segments = input.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const normalized = [];
  for (const value of segments) {
    if (CATEGORY_MAP[value]) normalized.push(value);
  }
  return normalized.length ? normalized : DEFAULT_CATEGORIES;
}

async function getTargetPlaces(destination, categories, apiKey) {
  const geo = await geocodeDestination(destination, apiKey);
  if (!geo) return null;

  const normalizedCategories = normalizeCategories(categories);
  const placesByCategory = await Promise.all(
    normalizedCategories.map(category => nearbyPlaces({ location: geo.location, category, apiKey }))
  );

  return {
    destination: geo.address,
    location: geo.location,
    categories: placesByCategory
  };
}

module.exports = {
  CATEGORY_MAP,
  normalizeCategories,
  getTargetPlaces
};
