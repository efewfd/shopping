module.exports = (conn) => {
  const mongoose = require('mongoose');
  const wishlistSchema = new mongoose.Schema({
    userId: {
      type: String,
      required: true
    },
    productId: {
      type: String,
      required: true
    },
    product: {
      title: { type: String, required: true },
      price: { type: Number, required: true },
      image: String,
      stock: Number
    }
  });

  // ✅ 유저별 상품 중복 찜 방지
  wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

  return conn.model('Wishlist', wishlistSchema);
};
