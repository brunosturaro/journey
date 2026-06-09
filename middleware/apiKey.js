const ApiKey = require('../models/ApiKey');

module.exports = async function apiKeyMiddleware(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) {
    return res.status(401).json({ error: 'API key required. Pass it in the X-Api-Key header.' });
  }
  try {
    const record = await ApiKey.findOne({ key, active: true });
    if (!record) {
      return res.status(403).json({ error: 'Invalid or revoked API key.' });
    }
    req.apiKeyOwner = record.userId;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
