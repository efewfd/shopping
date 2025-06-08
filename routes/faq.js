// routes/faq.js
const express = require('express');

module.exports = (Models) => {
  const router = express.Router();
  const Faq = Models.Faq; // ✅ shopDB로부터 주입받은 mongoose 모델

  // [GET] 전체 FAQ 조회
  router.get('/', async (req, res) => {
    try {
      const faqs = await Faq.find().sort({ _id: -1 });
      res.json(faqs);
    } catch (err) {
      console.error('❌ FAQ 불러오기 실패:', err);
      res.status(500).json({ message: 'FAQ 조회 실패', error: err.message });
    }
  });

  // [POST] FAQ 등록
  router.post('/', async (req, res) => {
    try {
      const { category, question, answer } = req.body;
      const newFaq = new Faq({ category, question, answer });
      await newFaq.save();
      res.json({ message: '등록 완료', faq: newFaq });
    } catch (err) {
      console.error('❌ FAQ 등록 실패:', err);
      res.status(500).json({ message: 'FAQ 등록 실패', error: err.message });
    }
  });

  // [DELETE] FAQ 삭제
  router.delete('/:id', async (req, res) => {
    try {
      await Faq.findByIdAndDelete(req.params.id);
      res.json({ message: '삭제 완료' });
    } catch (err) {
      console.error('❌ FAQ 삭제 실패:', err);
      res.status(500).json({ message: 'FAQ 삭제 실패', error: err.message });
    }
  });

  return router;
};
