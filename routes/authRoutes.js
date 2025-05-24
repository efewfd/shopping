// 인증 라우트
const express = require('express');
const multer = require('multer');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user');
const upload = multer();

// 회원가입
router.post('/register', upload.none(), async (req, res) => {
  const { userId, password, name, email } = req.body;

  console.log('[회원가입 요청]', { userId, name, email }); // 요청 데이터 확인용

  // 이미 존재하는 아이디인지 확인
  const existingUser = await User.findOne({ userId });
  if (existingUser) return res.status(400).json({ message: '이미 존재하는 ID입니다.' });

  // 비밀번호 암호화
  const hashedPw = await bcrypt.hash(password, 10);

  // 사용자 생성 및 저장
  const newUser = new User({ userId, password: hashedPw, name, email });
  await newUser.save();

  console.log('[회원가입 성공]', newUser); // 저장된 사용자 정보 확인
  res.json({ message: '회원가입 성공' });
});

// 로그인
router.post('/login', upload.none(), async (req, res) => {
  console.log('[로그인 req.body]', req.body);  // 터미널 확인용
  const { userId, password } = req.body;

  // 사용자 존재 여부 확인
  const user = await User.findOne({ userId });
  if (!user) return res.status(400).json({ message: '존재하지 않는 ID입니다.' });

  // 비밀번호 일치 여부 확인
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: '비밀번호가 틀렸습니다.' });

  // 세션에 사용자 정보 저장
  req.session.user = { userId: user.userId, name: user.name };
  console.log('[로그인 성공]', req.session.user); // 세션 정보 확인
  
  res.json({ message: '로그인 성공', user: req.session.user });
});

// 현재 로그인된 사용자 정보 확인
router.get('/user', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: '로그아웃 완료' });
  });
});

module.exports = router;
