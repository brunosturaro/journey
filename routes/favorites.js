const router = require('express').Router();
const Favorite = require('../models/Favorite');
const auth = require('../middleware/auth');

function normalizePlaces(places = []) {
  if (!Array.isArray(places)) return [];
  return places.filter(p => p && (p.place_id || p.name)).map(place => ({
    place_id: place.place_id ? String(place.place_id).trim() : undefined,
    name: place.name ? String(place.name).trim() : undefined,
    address: place.address ? String(place.address).trim() : undefined,
    category: place.category ? String(place.category).trim() : undefined,
    location: {
      lat: place.location?.lat != null ? Number(place.location.lat) : undefined,
      lng: place.location?.lng != null ? Number(place.location.lng) : undefined
    },
    distance_meters: place.distance_meters != null ? Number(place.distance_meters) : undefined,
    walking_minutes: place.walking_minutes != null ? Number(place.walking_minutes) : undefined,
    rating: place.rating != null ? Number(place.rating) : undefined,
    user_ratings_total: place.user_ratings_total != null ? Number(place.user_ratings_total) : undefined,
    open_now: place.open_now === true
  }));
}

// GET /favorites — list all favorites for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id }).sort('-createdAt');
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /favorites — create a new favorite
router.post('/', auth, async (req, res) => {
  const { name, origin, destination, places } = req.body;
  if (!name || !origin || !destination) {
    return res.status(400).json({ error: 'name, origin and destination are required' });
  }
  try {
    const normalizedPlaces = normalizePlaces(places);
    const fav = await Favorite.create({ userId: req.user.id, name, origin, destination, places: normalizedPlaces });
    res.status(201).json(fav);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /favorites/:id — full update (all fields required)
router.put('/:id', auth, async (req, res) => {
  const { name, origin, destination, places } = req.body;
  if (!name || !origin || !destination) {
    return res.status(400).json({ error: 'name, origin and destination are required' });
  }
  try {
    const fav = await Favorite.findOne({ _id: req.params.id, userId: req.user.id });
    if (!fav) return res.status(404).json({ error: 'Favorite not found' });
    fav.name = name;
    fav.origin = origin;
    fav.destination = destination;
    fav.places = normalizePlaces(places);
    await fav.save();
    res.json(fav);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /favorites/:id — partial update (only provided fields are changed)
router.patch('/:id', auth, async (req, res) => {
  const allowed = ['name', 'origin', 'destination', 'places'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  if ('places' in req.body) {
    updates.places = normalizePlaces(req.body.places);
  }
  try {
    const fav = await Favorite.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updates,
      { new: true, runValidators: true }
    );
    if (!fav) return res.status(404).json({ error: 'Favorite not found' });
    res.json(fav);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /favorites/:id — remove a favorite
router.delete('/:id', auth, async (req, res) => {
  try {
    const fav = await Favorite.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!fav) return res.status(404).json({ error: 'Favorite not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
