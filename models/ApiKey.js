const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  key:    { type: String, required: true, unique: true },
  name:   { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('ApiKey', apiKeySchema);
