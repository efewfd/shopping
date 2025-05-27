const express = require('express');
const router = express.Router();
const db = require('../js/db'); // ✅ DB 연결
const ProductModel = require('../models/product'); // mongoose 모델

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
      SELECT id, product_id, quantity, status, created_at, product_title, product_image
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    const result = orders.map(order => ({
      quantity: order.quantity,
      status: order.status,
      createdAt: order.created_at,
      productId: order.product_id, // ✅ 여기에 포함!
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
  console.log("📦 요청 바디 전체:", req.body);
  console.log("📦 userId:", userId);
  console.log("📦 productId:", productId);
  console.log("📦 quantity:", quantity);
  console.log("📦 product.title:", product?.title);
  console.log("📦 productTitle 최종:", (product?.title || "").trim());
  const productTitle = (product?.title || "").trim() || "제목없음";
  const productImage = product?.image || null;

  if (!userId || !productId || !productTitle) {
    return res.status(400).json({ message: '필수 항목 누락' });
  }

  try {
    // MongoDB에서 재고 먼저 확인
const mongoProduct = await ProductModel.findById(productId);
if (!mongoProduct || mongoProduct.stock < quantity) {
  return res.status(400).json({ message: '재고가 부족합니다.' });
}

    // 1. MySQL에 주문 등록
    await db.execute(`
      INSERT INTO orders (
        user_id, product_id, quantity, status, product_title, product_image
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId, productId, quantity || 1, status || '결제완료', productTitle, productImage
    ]);

    // 2. MySQL 재고 감소
    const [result] = await db.execute(`
      UPDATE products
      SET stock = stock - ?
      WHERE id = ? AND stock >= ?
    `, [quantity, productId, quantity]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: '재고 부족으로 주문이 실패했습니다.' });
    }

    // ✅ 3. MongoDB 재고도 함께 감소
try {
  console.log("🔎 MongoDB 재고 차감 대상 productId:", productId);
  await ProductModel.findByIdAndUpdate(productId, {
    $inc: { stock: -quantity }
  });
  console.log("📦 MongoDB 재고도 함께 차감 완료");
} catch (mongoErr) {
  console.error("❌ MongoDB 재고 차감 실패:", mongoErr.message);
}

    res.status(201).json({ message: '주문 등록 성공' });
  } catch (err) {
    console.error('🛑 주문 등록 실패:', err);
    console.error("🛑 전체 에러 객체:", err);
    res.status(500).json({ message: '서버 오류', error: err.message });
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
