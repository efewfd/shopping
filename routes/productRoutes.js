const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const Product = require('../models/product');
const crypto = require('crypto'); // UUID용
const db = require('../js/db'); // 



// ✅ 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });


// ✅ 랜덤 상품 조회
router.get('/random-products', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 5;
    const randomProducts = await Product.aggregate([{ $sample: { size: count } }]);
    res.json(randomProducts);
  } catch (err) {
    console.error('❌ 랜덤 상품 조회 실패:', err);
    res.status(500).json({ message: '랜덤 상품 조회 실패' });
  }
});

// ✅ 상세 조회 (MySQL 기준)
router.get('/:id', async (req, res) => {
  const id = req.params.id.trim();

  try {
    const [rows] = await db.execute(
      'SELECT * FROM products WHERE id = ?', 
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});




// ✅ 전체 상품 목록 조회 (MySQL 기준)
router.get('/', async (req, res) => {
  try {
    const { category1, category2 } = req.query;
    let sql = 'SELECT * FROM products';
    const params = [];
    const where = [];

    if (category1) {
      where.push('category1 = ?');
      params.push(category1);
    }

    // ✅ 'all'이 아닐 때만 category2 필터 적용
    if (category2 && category2 !== 'all') {
      where.push('FIND_IN_SET(?, category2)');
      params.push(category2);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ 상품 목록 조회 실패:', err);
    res.status(500).json({ message: '상품 목록 조회 실패', error: err.message });
  }
});







// ✅ 상품 등록 (UUID + Mongo + MySQL 동시 저장)
router.post('/', upload.fields([
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log("[폼 데이터 수신]", req.body);
    const { id, name, price, stock, category1, category2, deliveryStartDate } = req.body;
    const parsedPrice = parseInt(price, 10);
    const parsedStock = parseInt(stock, 10);

    if (!category2) {
      return res.status(400).json({ message: '2차 카테고리를 선택하세요.' });
    }

    const image_url = req.files.image ? `/uploads/${req.files.image[0].filename}` : '';
    const category2List = [category2];
    const productId = id || crypto.randomUUID();

    const productData = {
      _id: productId,
      name,
      price: parsedPrice,
      stock: parsedStock,
      image_url,
      category1,
      category2: category2List,
      deliveryStartDate: deliveryStartDate || null  // ✅ Mongo에 같이 저장하고 싶으면
    };

    // MongoDB 저장
    const product = new Product(productData);
    await product.save();

    // ✅ MySQL 저장에 날짜 컬럼 포함
    await db.execute(`
      INSERT INTO products (
        id, name, price, image_url, stock, category1, category2, delivery_start_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      productId,
      name,
      parsedPrice,
      image_url,
      parsedStock,
      category1,
      category2List.join(','),
      deliveryStartDate || null   // ✅ 전달된 날짜 (없으면 null)
    ]);

    res.json({ message: '상품 등록 완료', product });

  } catch (err) {
    console.error("❌ 상품 등록 중 오류:", err);
    res.status(500).json({ message: '상품 등록 실패', error: err.message });
  }
});



// ✅ 상품 수정 (MySQL + MongoDB)
router.put('/:id', async (req, res) => {
  const { name, price, stock } = req.body;
  const id = req.params.id;

  console.log("🔧 수정 요청:", { id, name, price, stock });

  try {
    // MySQL 수정
    await db.execute(`
      UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?
    `, [name, price, stock, id]);

    // MongoDB 수정 (UUID 안전)
    const mongoResult = await Product.findOneAndUpdate({ _id: id }, {
      name,
      price,
      stock
    });

    console.log("✅ MongoDB 수정 결과:", mongoResult);
    res.json({ message: '상품 수정 완료 (MySQL + MongoDB)' });
  } catch (err) {
    console.error('❌ 상품 수정 실패:', err.message);
    res.status(500).json({ message: '상품 수정 실패', error: err.message });
  }
});


// ✅ 상품 삭제 (MySQL중심으로)
router.delete('/:id', async (req, res) => {
  const id = req.params.id.trim();

  try {
    // ✅ MySQL 삭제
    const [result] = await db.execute('DELETE FROM products WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    // ✅ MongoDB도 함께 정리
    await Product.findOneAndDelete({ _id: id });

    res.json({ message: '상품 삭제 완료' });
  } catch (err) {
    console.error('❌ 상품 삭제 실패:', err);
    res.status(500).json({ message: '삭제 실패', error: err.message });
  }
});



module.exports = router;