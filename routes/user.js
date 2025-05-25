const express = require('express');
const router = express.Router();
const User = require('../models/user'); 



// 회원정보 조회
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).select('-password');
    if (!user) return res.status(404).json({ message: '사용자 없음' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: '조회 실패', error: err.message });
  }
});

// 회원정보 수정
router.put('/:userId', async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findOneAndUpdate(
      { userId: req.params.userId },
      { name, email },
      { new: true }
    ).select('-password');
    res.json({ message: '회원정보 수정 완료', user });
  } catch (err) {
    res.status(500).json({ message: '수정 실패', error: err.message });
  }
});

module.exports = router;

