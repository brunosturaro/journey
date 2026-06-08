const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  origin: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  places: [{
    place_id: { type: String, trim: true },
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    category: { type: String, trim: true },
    location: {
      lat: Number,
      lng: Number
    },
    distance_meters: Number,
    walking_minutes: Number,
    rating: Number,
    user_ratings_total: Number,
    open_now: Boolean
  }]
}, { timestamps: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
