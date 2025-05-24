// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  productId: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  status: {
    type: String,
    enum: ['배송준비중', '배송중', '배송완료', '취소', '교환', '반품'],
    default: '배송준비중'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  product: {
    title: { type: String },
    image: { type: String }
  }
});

module.exports = mongoose.model('Order', orderSchema);
