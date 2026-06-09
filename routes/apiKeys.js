const router  = require('express').Router();
const crypto  = require('crypto');
const ApiKey  = require('../models/ApiKey');
const auth    = require('../middleware/auth');

// POST /api-keys — generate a new key (requires login)
router.post('/', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const key = 'ptv_' + crypto.randomBytes(24).toString('hex');
  try {
    const record = await ApiKey.create({ key, name, userId: req.user.id });
    res.status(201).json({ id: record._id, name: record.name, key: record.key, createdAt: record.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api-keys — list your keys (key value is masked after creation)
router.get('/', auth, async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user.id }).sort('-createdAt');
    res.json(keys.map(k => ({
      id: k._id,
      name: k.name,
      key: k.key.slice(0, 10) + '••••••••••••••••',
      active: k.active,
      createdAt: k.createdAt
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api-keys/:id — revoke a key
router.delete('/:id', auth, async (req, res) => {
  try {
    const record = await ApiKey.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!record) return res.status(404).json({ error: 'API key not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
