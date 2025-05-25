const express = require('express');
const router = express.Router();
const Faq = require('../models/faq');

// 전체 조회
router.get('/', async (req, res) => {
  const faqs = await Faq.find().sort({ _id: -1 });
  res.json(faqs);
});

// 등록
router.post('/', async (req, res) => {
  const { category, question, answer } = req.body;
  const newFaq = new Faq({ category, question, answer });
  await newFaq.save();
  res.json({ message: '등록 완료', faq: newFaq });
});

// 삭제
router.delete('/:id', async (req, res) => {
  await Faq.findByIdAndDelete(req.params.id);
  res.json({ message: '삭제 완료' });
});

module.exports = router;
