const mongoose = require('mongoose');

const forbiddenWordSchema = new mongoose.Schema({
  word: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('ForbiddenWord', forbiddenWordSchema);
