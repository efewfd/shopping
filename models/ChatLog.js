const mongoose = require('mongoose');

const ChatLogSchema = new mongoose.Schema({
  customerId: String,
  sender: String,
  message: String,
  messageId: String,
  read: { type: Boolean, default: false },
  time: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatLog', ChatLogSchema);