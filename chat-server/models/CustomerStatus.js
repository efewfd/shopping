const mongoose = require('mongoose');

const customerStatusSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  isEnded: { type: Boolean, default: false },
  endedAt: { type: Date, default: null }
});

module.exports = mongoose.model('CustomerStatus', customerStatusSchema);
