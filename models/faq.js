const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  category: String,
  question: String,
  answer: String
});

module.exports = mongoose.model('Faq', faqSchema);
