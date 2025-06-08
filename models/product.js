module.exports = (conn) => {
  const mongoose = require('mongoose');
  const productSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // ✅ ObjectId → String으로 바꾸기
    name: String,
    price: Number,
    image_url: String,
    stock: Number,
    category1: String,
    category2: [String],
    created_at: { type: Date, default: Date.now }
  });
  return conn.model('Product', productSchema);
};
