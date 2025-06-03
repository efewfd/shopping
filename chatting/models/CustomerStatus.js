const mongoose = require('mongoose');

const CustomerStatusSchema = new mongoose.Schema({
   customerId: { type: String, required: true, unique: true }, // Socket ID
   name: { type: String, required: true },
   isEnded: { type: Boolean, default: false },  // 종료 여부
   endedAt: { type: Date, default: null }       // 종료 시간
});

module.exports = mongoose.model('CustomerStatus', CustomerStatusSchema);