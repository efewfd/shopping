const express = require('express');
const router = express.Router();
const Wishlist = require('../models/wishlist');

// [POST] 찜 추가
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

// [DELETE] 찜 삭제
router.delete('/', async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const result = await Wishlist.deleteOne({ userId, productId });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('찜 삭제 실패:', err);
    res.status(500).json({ message: '서버 오류 발생' });
  }
});

// ✅ [GET] 특정 유저의 찜 목록 조회 추가
router.get('/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const wishlist = await Wishlist.find({ userId });
    res.json(wishlist); // [{ userId, productId, product: {...} }]
  } catch (err) {
    console.error('찜 목록 조회 실패:', err);
    res.status(500).json({ message: '서버 오류 발생' });
  }
});

module.exports = router;
