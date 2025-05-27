const express = require('express');
const router = express.Router();
const Wishlist = require('../models/wishlist');
const Product = require('../models/product');


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


// 유효하지 않은 찜 상품 자동 삭제
router.delete('/invalid/:userId', async (req, res) => {
  const userId = req.params.userId;

  const wishlist = await Wishlist.find({ userId });

  const validWishlist = [];

  for (const item of wishlist) {
    if (!item.productId || typeof item.productId !== 'string') continue;

    const product = await Product.findOne({ _id: item.productId });
    if (product) validWishlist.push(item);
  }

  await Wishlist.deleteMany({ userId });
  await Wishlist.insertMany(validWishlist);

  res.json({ message: "유효하지 않은 찜 상품 및 빈 항목 삭제 완료" });
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
