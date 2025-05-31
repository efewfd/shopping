const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  customerId: String,
  sender: String, // 'customer' 또는 'admin'
  message: String,
  messageId: String,
  read: { type: Boolean, default: false },
  time: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatLog', chatSchema);
