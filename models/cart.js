const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  productId: {
    type: String,
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  product: {
    title: String,
    price: Number,
    image: String,
    stock: Number
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ 한 사용자가 같은 상품을 중복해서 담지 못하게 제한
cartSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema);
