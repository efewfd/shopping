const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const Product = require('../models/product');
const db = require('../js/db'); // 



// 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// 상품 목록
router.get('/', async (req, res) => {
  try {
    const { category1, category2 } = req.query;
    const query = {};

    if (category1) query.category1 = category1;
    if (category2) query.category2 = category2;

    console.log('[상품 목록 요청]', req.query, query); // 로그 추가

    const products = await Product.find(query).sort({ created_at: -1 });
    res.json(products);
  } catch (err) {
    console.error('❌ 상품 목록 조회 중 오류:', err);
    res.status(500).json({ message: '상품 목록 조회 실패', error: err.message });
  }
});


// 상품 등록
router.post(
  '/',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'id' },
    { name: 'name' },
    { name: 'price' },
    { name: 'stock' },
    { name: 'category1' },
    { name: 'category2' }
  ]),
  async (req, res) => {
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
      const productId = id || new mongoose.Types.ObjectId().toHexString();

      const productData = {
        _id: productId,
        name,
        price: parsedPrice,
        stock: parsedStock,
        image_url,
        category1,
        category2: category2List
      };
      const product = new Product(productData);
      await product.save();

      await db.execute(
        `INSERT INTO products (id, name, price, image_url, stock, category1, category2)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [productId, name, parsedPrice, image_url, parsedStock, category1, category2List.join(',')]
      );


      res.json({ message: '상품 등록 완료', product });

    } catch (err) {
      console.error("❌ 상품 등록 중 오류:", err);
      res.status(500).json({ message: '상품 등록 실패', error: err.message });
    }
  }
);





// 상품 삭제
router.delete('/:id', async (req, res) => {
  console.log('삭제 요청 도착:', req.params.id);
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: '상품 삭제 완료' });
  } catch (err) {
    res.status(500).json({ message: '삭제 실패', error: err.message });
  }
});

// 상품 수정
router.put('/:id', async (req, res) => {
  const { name, price, stock } = req.body;
  try {
    await Product.findByIdAndUpdate(req.params.id, { name, price, stock });
    res.json({ message: '상품 수정 완료' });
  } catch (err) {
    res.status(500).json({ message: '수정 실패', error: err.message });
  }
});

// 랜덤 상품 3개 가져오기
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



// 상세 페이지 조회 API
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ 문자열 기반 _id 조회
    const product = await Product.findOne({ _id: id });

    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    res.json(product);
  } catch (err) {
    console.error('❌ 상품 조회 실패:', err.message);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});





module.exports = router;
