const express = require('express');
const router = express.Router();
const Review = require('../models/review'); // 리뷰 모델

// 리뷰 불러오기
router.get('/:productId', async (req, res) => {
  const { productId } = req.params;
  const { sort } = req.query;
  const limit = Number(req.query.limit || 10); //안전하게 변환
  const page = Number(req.query.page || 1);


  let sortOption = { createdAt: -1 }; // 기본 최신순

  if (sort === 'rating-high') sortOption = { rating: -1 };
  else if (sort === 'rating-low') sortOption = { rating: 1 };

  try {
    const total = await Review.countDocuments({ productId });
    //보완코드 추가
    const reviews = await Review.find({ productId })
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ reviews, total });
  } catch(err) {
    console.error(' 리뷰 불러오기 실패:', err);
    res.status(500).json({ message: '리뷰 불러오기 실패' });
  }
  
});

// 리뷰 등록
router.post('/', async (req, res) => {
  const { productId, userId, content, rating } = req.body;

  // 로그인 안 된 상태는 막기 (보조적 방어)
  if (!userId) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }


  try {
    const review = new Review({ productId, userId, content, rating });
    await review.save();
    res.json({ message: '등록 완료' });
  } catch(err) {
    console.error('리뷰 등록 실패:', err);
    res.status(500).json({ message: '리뷰 등록 실패' });
  }
});

// const mysql = require('mysql2/promise'); // MySQL 연결 필요

// // 리뷰 등록
// router.post('/', async (req, res) => {
//   const { productId, userId, content, rating } = req.body;

//   try {
//     // ✅ 1. MySQL에서 구매내역 확인
//     const connection = await mysql.createConnection({
//       host: 'localhost',
//       user: 'yourUser',
//       password: 'yourPw',
//       database: 'yourDb'
//     });

//     const [rows] = await connection.execute(
//       `SELECT * FROM orders 
//        WHERE user_id = ? 
//        AND product_id = ? 
//        AND status = '배송완료'`,  // 배송 상태 체크
//       [userId, productId]
//     );

//     await connection.end();

//     if (rows.length === 0) {
//       return res.status(403).json({ message: '배송 완료된 상품만 리뷰 작성이 가능합니다.' });
//     }

//     // ✅ 2. MongoDB에 리뷰 저장
//     const review = new Review({ productId, userId, content, rating });
//     await review.save();
//     res.json({ message: '리뷰 등록 완료' });

//   } catch(err) {
//     console.error('리뷰 등록 오류:', err);
//     res.status(500).json({ message: '서버 오류' });
//   }
// });


module.exports = router;