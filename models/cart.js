module.exports = (conn) => {
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

  cartSchema.index({ userId: 1, productId: 1 }, { unique: true });

  return conn.model('Cart', cartSchema);
};
