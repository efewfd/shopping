const express = require('express');
const router = express.Router();
const db = require('../js/db'); // ✅ DB 연결
// [GET] 전체 주문 목록 (관리자용)
router.get('/', async (req, res) => {
  try {
    const [orders] = await db.execute(`
      SELECT 
        o.id,
        o.user_id,
        u.name AS user_name,
        o.product_id,
        o.product_title,
        o.quantity,
        o.status,
        o.created_at
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      ORDER BY o.created_at DESC
    `);

    res.json(orders);
  } catch (err) {
    console.error('🛑 전체 주문 목록 조회 실패:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 주문 조회
router.get('/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const [orders] = await db.execute(`
      SELECT id, quantity, status, created_at, product_title, product_image
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    // 프론트 JS에서 기대하는 구조로 변환
    const result = orders.map(order => ({
      quantity: order.quantity,
      status: order.status,
      createdAt: order.created_at,
      product: {
        title: order.product_title,
        image: order.product_image
      }
    }));

    res.json(result);
  } catch (err) {
    console.error('🛑 주문 내역 불러오기 실패:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});


// 주문 저장 API
router.post('/', async (req, res) => {
  const { userId, productId, quantity, status, product } = req.body;

const productTitle = (product?.title || "").trim() || "제목없음";
  const productImage = product?.image || null;

    console.log("🔥 서버에서 받은 quantity:", quantity);
  console.log("🔥 서버에서 받은 productId:", productId);

console.log("📦 요청 바디 전체:", req.body);
console.log("📦 productTitle 최종:", productTitle);

  if (!userId || !productId || !productTitle) {
    return res.status(400).json({ message: '필수 항목 누락' });
  }

  try {
    // 1. 주문 저장
    await db.execute(`
      INSERT INTO orders (
        user_id, product_id, quantity, status, product_title, product_image
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId, productId, quantity || 1, status || '결제완료', productTitle, productImage
    ]);

    // 2. 재고 감소
    const [result] = await db.execute(`
      UPDATE products
      SET stock = stock - ?
      WHERE id = ? AND stock >= ?
    `, [quantity, productId, quantity]);

    console.log("🧪 재고 차감 affectedRows:", result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: '재고 부족으로 주문이 실패했습니다.' });
    }

    console.log("✅ 주문 등록 및 재고 차감 완료:", productTitle);
    res.status(201).json({ message: '주문 등록 성공' });
  } catch (err) {
    console.error('🛑 주문 등록 실패:', err);
    res.status(500).json({ message: '서버 오류' });
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
