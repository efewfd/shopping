const express = require('express');
const router = express.Router();
const multer = require('multer');
const Product = require('../models/product');

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
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, price, stock, category1, category2 } = req.body;

    if (!category2) {
      return res.status(400).json({ message: '2차 카테고리를 선택하세요.' });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : '';
    const category2List = [category2, 'all'];

    const product = new Product({ name, price, stock, image_url, category1, category2: category2List });
    await product.save();

    res.json({ message: '상품 등록 완료', product });

  } catch (err) {
    console.error("❌ 상품 등록 중 오류:", err); // 🔥 여기 추가해야 콘솔에 원인 뜸!
    res.status(500).json({ message: '상품 등록 실패', error: err.message });
  }
});


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
    const product = await Product.findById(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
  }
});





module.exports = router;
