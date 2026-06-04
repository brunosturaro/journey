const router = require('express').Router();
const Favorite = require('../models/Favorite');
const auth = require('../middleware/auth');

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
  const { name, origin, destination } = req.body;
  if (!name || !origin || !destination) {
    return res.status(400).json({ error: 'name, origin and destination are required' });
  }
  try {
    const fav = await Favorite.create({ userId: req.user.id, name, origin, destination });
    res.status(201).json(fav);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /favorites/:id — full update (all fields required)
router.put('/:id', auth, async (req, res) => {
  const { name, origin, destination } = req.body;
  if (!name || !origin || !destination) {
    return res.status(400).json({ error: 'name, origin and destination are required' });
  }
  try {
    const fav = await Favorite.findOne({ _id: req.params.id, userId: req.user.id });
    if (!fav) return res.status(404).json({ error: 'Favorite not found' });
    Object.assign(fav, { name, origin, destination });
    await fav.save();
    res.json(fav);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /favorites/:id — partial update (only provided fields are changed)
router.patch('/:id', auth, async (req, res) => {
  const allowed = ['name', 'origin', 'destination'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
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
