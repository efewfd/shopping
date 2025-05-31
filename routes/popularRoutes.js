const express = require('express');
const router = express.Router();
const db = require('../js/db');
const Review = require('../models/review');
const Wishlist = require('../models/wishlist');


router.get('/', async (req, res) => {
  try {
    // 1. MySQL: 판매량 조회
    const [salesRows] = await db.execute(`
        SELECT p.id, p.name, p.image_url, p.price,
            IFNULL(SUM(o.quantity), 0) AS total_sales
        FROM products p
        LEFT JOIN orders o ON p.id = o.product_id
        GROUP BY p.id
    `);

    // 2. MongoDB: 리뷰/찜 데이터 수집
    const allReviewStats = await Review.aggregate([
      {
        $group: {
          _id: "$productId",
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    const allWishlistStats = await Wishlist.aggregate([
      {
        $group: {
          _id: "$productId",
          wishCount: { $sum: 1 }
        }
      }
    ]);

    // 3. 매핑용 Map
    const reviewMap = new Map();
    allReviewStats.forEach(r => {
      reviewMap.set(r._id, { avgRating: r.avgRating, reviewCount: r.reviewCount });
    });

    const wishMap = new Map();
    allWishlistStats.forEach(w => {
      wishMap.set(w._id, w.wishCount);
    });

    // 4. 통합 점수 계산
    const scored = salesRows.map(p => {
      const r = reviewMap.get(p.id) || { avgRating: 0, reviewCount: 0 };
      const wishCount = wishMap.get(p.id) || 0;

      const score =
        (p.total_sales * 1) +
        (r.reviewCount * 2) +
        (r.avgRating * 10) +
        (wishCount * 1.5);

      return {
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        price: p.price,
        total_sales: p.total_sales,
        avg_rating: r.avgRating,
        review_count: r.reviewCount,
        wish_count: wishCount,
        score
      };
    });

    // 5. 정렬 및 TOP 5 반환
    scored.sort((a, b) => b.score - a.score);
    res.json(scored.slice(0, 5));
  } catch (err) {
    console.error('❌ 인기 상품 분석 실패:', err);
    res.status(500).json({ message: '인기 상품 조회 실패', error: err.message });
  }
});

module.exports = router;