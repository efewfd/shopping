
// routes/popularRoutes.js
module.exports = (Models) => {
  const express = require('express');
  const router = express.Router();
  const db = require('../js/db');

  router.get('/', async (req, res) => {
    try {
      const [salesRows] = await db.execute(`
        SELECT p.id, p.name, p.image_url, p.price,
          IFNULL(SUM(o.quantity), 0) AS total_sales
        FROM products p
        LEFT JOIN orders o ON p.id = o.product_id
        GROUP BY p.id
      `);

      const allReviewStats = await Models.Review.aggregate([
        { $group: {
            _id: "$productId",
            avgRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 }
        }}
      ]);

      const [wishlistRows] = await db.execute(`
        SELECT product_id AS productId, COUNT(*) AS wishCount
        FROM wishlist
        GROUP BY product_id
      `);

      const wishMap = new Map();
      wishlistRows.forEach(w => {
        wishMap.set(w.productId, w.wishCount);
      });


      const reviewMap = new Map();
      allReviewStats.forEach(r => {
        reviewMap.set(r._id, { avgRating: r.avgRating, reviewCount: r.reviewCount });
      });

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
      

      scored.sort((a, b) => b.score - a.score);

      if (!scored || scored.length === 0) {
        return res.json([]); // ⭐ 빈 배열이라도 반환
      }

      res.json(scored.slice(0, 5));
    } catch (err) {
      console.error('❌ 인기 상품 분석 실패:', err);
      res.status(500).json({ message: '인기 상품 조회 실패', error: err.message });
    }
  });

  return router;
};
