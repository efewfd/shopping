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


// ✅ 전체 상품 목록 조회
router.get('/', async (req, res) => {
  try {
    const { category1, category2 } = req.query;
    const query = {};

    if (category1) query.category1 = category1;
    if (category2) query.category2 = category2;

    console.log('[상품 목록 요청]', req.query, query);
    const products = await Product.find(query).sort({ created_at: -1 });
    res.json(products);
  } catch (err) {
    console.error('❌ 상품 목록 조회 중 오류:', err);
    res.status(500).json({ message: '상품 목록 조회 실패', error: err.message });
  }
});


// ✅ 상세 조회 (UUID 안전)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id }); // UUID 문자열에 안전

    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    res.json(product);
  } catch (err) {
    console.error('❌ 상품 조회 실패:', err.message);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});


// ✅ 상품 등록 (UUID + Mongo + MySQL 동시 저장)
router.post('/', upload.fields([
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log("[폼 데이터 수신]", req.body);
    const { id, name, price, stock, category1, category2 } = req.body;
    const parsedPrice = parseInt(price, 10);
    const parsedStock = parseInt(stock, 10);

    if (!category2) {
      return res.status(400).json({ message: '2차 카테고리를 선택하세요.' });
    }

    const image_url = req.files.image ? `/uploads/${req.files.image[0].filename}` : '';
    const category2List = [category2, 'all'];
    const productId = id || crypto.randomUUID();

    const productData = {
      _id: productId,
      name,
      price: parsedPrice,
      stock: parsedStock,
      image_url,
      category1,
      category2: category2List
    };

    // MongoDB 저장
    const product = new Product(productData);
    await product.save();

    // MySQL 저장
    await db.execute(`
      INSERT INTO products (id, name, price, image_url, stock, category1, category2)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [productId, name, parsedPrice, image_url, parsedStock, category1, category2List.join(',')]);

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


// ✅ 상품 삭제
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Product.findOneAndDelete({ _id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }
    res.json({ message: '상품 삭제 완료' });
  } catch (err) {
    console.error('❌ 상품 삭제 실패:', err);
    res.status(500).json({ message: '삭제 실패', error: err.message });
  }
});


module.exports = router;