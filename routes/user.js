const express = require('express');
const router = express.Router();
const User = require('../models/user'); 




// 회원정보 조회
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [users] = await db.execute('SELECT name, email FROM users WHERE user_id = ?', [userId]);
    if (!users.length) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    res.json(users[0]);
  } catch (err) {
    console.error('회원 정보 조회 실패:', err.message);
    res.status(500).json({ message: '서버 오류' });
  }
});


// 회원정보 수정
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email } = req.body;

    await db.execute('UPDATE users SET name = ?, email = ? WHERE user_id = ?', [name, email, userId]);
    res.json({ message: '회원 정보가 수정되었습니다.' });
  } catch (err) {
    console.error('회원 정보 수정 실패:', err.message);
    res.status(500).json({ message: '서버 오류' });
  }
});


module.exports = router;

