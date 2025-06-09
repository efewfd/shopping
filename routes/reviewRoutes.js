// routes/review.js
const express = require('express');

module.exports = (Models) => {
  const router = express.Router();
  const Review = Models.Review; // ✅ shopDB로부터 주입받은 mongoose 모델

  // [GET] 특정 상품의 리뷰 조회 (페이징 및 정렬 포함)
  router.get('/:productId', async (req, res) => {
    const { productId } = req.params;
    const { sort } = req.query;
    const limit = Number(req.query.limit || 10);
    const page = Number(req.query.page || 1);

    let sortOption = { createdAt: -1 }; // 기본값: 최신순

    if (sort === 'rating-high') sortOption = { rating: -1 };
    else if (sort === 'rating-low') sortOption = { rating: 1 };

    try {
      const total = await Review.countDocuments({ productId });
      const reviews = await Review.find({ productId })
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit);
      res.json({ reviews, total });
    } catch (err) {
      console.error('❌ 리뷰 불러오기 실패:', err);
      res.status(500).json({ message: '리뷰 불러오기 실패', error: err.message });
    }
  });

  // [POST] 리뷰 등록
  router.post('/', async (req, res) => {
    const { productId, userId, content, rating } = req.body;

    if (!userId) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    try {
      const review = new Review({ productId, userId, content, rating });
      await review.save();
      res.json({ message: '등록 완료', review });
    } catch (err) {
      console.error('❌ 리뷰 등록 실패:', err);
      res.status(500).json({ message: '리뷰 등록 실패', error: err.message });
    }
  });

  return router;
};
