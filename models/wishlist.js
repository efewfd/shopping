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
    title: String,
    price: Number,
    image: String,
    stock: Number
  }
});

module.exports = mongoose.model('Wishlist', wishlistSchema);
