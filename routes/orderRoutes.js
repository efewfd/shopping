const express = require('express');
const router = express.Router();
const db = require('../js/db'); // ✅ DB 연결

// 주문 저장 API
router.post('/', async (req, res) => {
  try {
    const { userId, productId, quantity, status } = req.body;
    if (!userId || !productId || !quantity) {
      return res.status(400).json({ message: '필수 항목 누락' });
    }

    await db.execute(
      'INSERT INTO orders (user_id, product_id, quantity, status) VALUES (?, ?, ?, ?)',
      [userId, productId, quantity, status || '배송준비중']
    );

    res.json({ message: '주문이 완료되었습니다.' });
  } catch (err) {
    console.error('[주문 오류]', err.message);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// 주문 조회
router.get('/', async (req, res) => {
  try {
    const [orders] = await db.execute(`
      SELECT 
        o.id,
        o.user_id,
        u.name AS user_name,
        o.product_id,
        p.name AS product_name,  -- ✅ 이 라인이 상품명을 불러오는 핵심
        o.quantity,
        o.status,
        o.created_at
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `);
    res.json(orders);
  } catch (err) {
    console.error("전체 주문 조회 실패:", err.message);
    res.status(500).json({ message: "서버 오류" });
  }
});

// PATCH /api/orders/:id
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;

  await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
  res.json({ message: '상태가 변경되었습니다.' });
});



module.exports = router;
