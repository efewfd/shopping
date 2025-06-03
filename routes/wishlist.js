const express = require('express');
const router = express.Router();
const db = require('../js/db'); // ✅ MySQL 연결 객체 (mysql2/promise 기반)


// [POST] 찜 등록
router.post('/', async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId || !productId) {
    return res.status(400).json({ message: 'userId 또는 productId가 누락되었습니다.' });
  }

  try {
    await db.execute(
      'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
      [userId, productId]
    );
    res.status(201).json({ message: '찜 등록 완료' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '이미 찜한 상품입니다.' });
    }
    console.error('찜 등록 실패:', err);
    res.status(500).json({ message: '서버 오류 발생' });
  }
});


// [DELETE] 찜 삭제
router.delete('/', async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const [result] = await db.execute(
      'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    res.json({ success: true, deletedCount: result.affectedRows });
  } catch (err) {
    console.error('찜 삭제 실패:', err);
    res.status(500).json({ message: '서버 오류 발생' });
  }
});



// [GET] 유저의 찜 목록
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT p.* FROM wishlist w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ?`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('찜 목록 조회 실패:', err);
    res.status(500).json({ message: '서버 오류 발생' });
  }
});

module.exports = router;
