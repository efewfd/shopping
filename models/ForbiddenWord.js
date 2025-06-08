module.exports = (conn) => {
  const mongoose = require('mongoose');

  const ForbiddenWordSchema = new mongoose.Schema({
    word: { type: String, required: true, unique: true }
  });

  return conn.model('ForbiddenWord', ForbiddenWordSchema);
};
