// routes/wishlist.js
const express = require('express');
const router = express.Router();
const Wishlist = require('../models/wishlist');

router.post('/', async (req, res) => {
  try {
    console.log('📦 받은 요청:', req.body);
    const item = await Wishlist.create(req.body);
    console.log('✅ 찜 저장됨:', item);
    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error('찜 등록 실패:', error);
    res.status(500).json({ message: '서버 오류 발생' });
  }
});

router.delete('/', async (req, res) => {
  const { userId, productId } = req.body;
  await Wishlist.deleteOne({ userId, productId });
  res.json({ success: true });
});




module.exports = router;
