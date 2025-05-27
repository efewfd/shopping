const express = require('express');
const router = express.Router();
const db = require('../js/db');

// [GET] 회원 정보 조회
router.get('/:id', async (req, res) => {
  const userId = req.params.id; // ex) 'wsx03sd'
  const sql = 'SELECT id, name, email FROM users WHERE user_id = ?'; // ✅ 컬럼명 수정

  try {
    const [rows] = await db.query(sql, [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '회원이 존재하지 않습니다.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('회원 정보 조회 실패:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// [PUT] 회원 정보 수정
router.put('/:id', async (req, res) => {
  const userId = req.params.id;
  const { name, email } = req.body;
  const sql = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
  try {
    const [result] = await db.query(sql, [name, email, userId]);
    res.json({ message: '회원 정보가 성공적으로 수정되었습니다.' });
  } catch (err) {
    console.error('회원 정보 수정 실패:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
