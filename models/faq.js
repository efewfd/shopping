module.exports = (conn) => {
  const mongoose = require('mongoose');
  const faqSchema = new mongoose.Schema({
    category: String,
    question: String,
    answer: String
  });

  return conn.model('Faq', faqSchema);
};
