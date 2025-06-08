// models/ChatLog.js
module.exports = (conn) => {
  const mongoose = require('mongoose');

  const ChatLogSchema = new mongoose.Schema({
    customerId: String,
    sender: String,
    message: String,
    messageId: String,
    read: { type: Boolean, default: false },
    time: { type: Date, default: Date.now }
  });

  return conn.model('ChatLog', ChatLogSchema);
};
