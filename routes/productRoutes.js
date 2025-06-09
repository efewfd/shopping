const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const db = require('../js/db'); // MySQL 연결

module.exports = (Models) => {
  const router = express.Router();
  const Product = Models.Product;

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
      const [rows] = await db.query(
        'SELECT id, name, image_url FROM products ORDER BY RAND() LIMIT ?',
        [count]
      );
      res.json(rows);
    } catch (err) {
      console.error('❌ 랜덤 상품 조회 실패:', err);
      res.status(500).json({ message: '랜덤 상품 조회 실패' });
    }
  });

  // ✅ 상세 조회
  router.get('/:id', async (req, res) => {
    const id = req.params.id.trim();
    try {
      const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
      }
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ message: '서버 오류', error: err.message });
    }
  });

  // ✅ 전체 상품 목록 조회
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

  // ✅ 상품 등록
  router.post('/', upload.fields([{ name: 'image', maxCount: 1 }]), async (req, res) => {
    try {
      console.log("[폼 데이터 수신]", req.body);
      const { id, name, price, stock, category1, category2, deliveryStartDate } = req.body;
      const parsedPrice = parseInt(price, 10) || 0;
      const parsedStock = parseInt(stock, 10) || 0;

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
        deliveryStartDate: deliveryStartDate || null
      };

      // MongoDB 저장
      const product = new Product(productData);
      await product.save();

      // MySQL 저장
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
        deliveryStartDate || null
      ]);

      res.json({ message: '상품 등록 완료', product });
    } catch (err) {
      console.error("❌ 상품 등록 중 오류:", err);
      res.status(500).json({ message: '상품 등록 실패', error: err.message });
    }
  });

  // ✅ 상품 수정
  router.put('/:id', async (req, res) => {
    const { name, price, stock } = req.body;
    const id = req.params.id;

    console.log("🔧 수정 요청:", { id, name, price, stock });

    try {
      await db.execute(
        `UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?`,
        [name, price, stock, id]
      );

      await Product.findOneAndUpdate({ _id: id }, { name, price, stock });
      res.json({ message: '상품 수정 완료 (MySQL + MongoDB)' });
    } catch (err) {
      console.error('❌ 상품 수정 실패:', err.message);
      res.status(500).json({ message: '상품 수정 실패', error: err.message });
    }
  });

  // ✅ 상품 삭제
  router.delete('/:id', async (req, res) => {
    const id = req.params.id.trim();
    try {
      const [result] = await db.execute('DELETE FROM products WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
      }

      await Product.findOneAndDelete({ _id: id });
      res.json({ message: '상품 삭제 완료' });
    } catch (err) {
      console.error('❌ 상품 삭제 실패:', err);
      res.status(500).json({ message: '삭제 실패', error: err.message });
    }
  });

  return router;
};
