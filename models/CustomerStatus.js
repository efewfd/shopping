module.exports = (conn) => {
  const mongoose = require('mongoose');

  const CustomerStatusSchema = new mongoose.Schema({
    customerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    userId: { type: String, required: true },
    isEnded: { type: Boolean, default: false },
    endedAt: { type: Date, default: null }
  });

  return conn.model('CustomerStatus', CustomerStatusSchema);
};
