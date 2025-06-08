const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const userRoutes = require('./routes/user'); // 경로 맞게 수정

const orderRoutes = require('./routes/orderRoutes');
const db = require('./js/db');
const reviewRoutes = require('./routes/reviewRoutes');
const http = require('http');
const wishlistRoutes = require('./routes/wishlist');
const shopDB = mongoose.createConnection("mongodb://localhost:27017/shopmall", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const chatDB = mongoose.createConnection("mongodb://localhost:27017/chat", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app); // Express app 위에 서버 생성
const io = new Server(server);         // Socket.IO 생성
const PORT = 3000;
let Models = {};
shopDB.once('open', () => {
  console.log('✅ shopDB 연결 완료');

  Models.Product = require('./models/product')(shopDB);
  Models.Review = require('./models/review')(shopDB);
  Models.Wishlist = require('./models/wishlist')(shopDB);
  Models.User = require('./models/user')(shopDB);
  Models.Order = require('./models/Order')(shopDB);
  Models.Faq = require('./models/faq')(shopDB);
  Models.Cart = require('./models/cart')(shopDB);

  // ✅ 정확히 여기에서 인기상품 라우터 등록
  const productRoutes = require('./routes/productRoutes');
  const popularRoutes = require('./routes/popularRoutes')(Models);
  const faqRoutes = require('./routes/faq')(Models);
  app.use('/api/products/popular', popularRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/faqs', faqRoutes);

  // ✅ 모든 라우터 등록 끝나고 listen 실행
  server.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
  });
});

// ✅ 전역 상태 변수
const customers = {};
const customerNames = {};
let adminSockets = new Set(); // 🔥 여러 관리자 또는 재접속 대비
let forbiddenWords = [];
// ✅ 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExt = ['.jpg', '.jpeg', '.png', '.gif'];
    const allowedMime = ['image/jpeg', 'image/png', 'image/gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (allowedExt.includes(ext) && allowedMime.includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error('❌ 허용되지 않은 파일 형식입니다.'));
    }
  }
});
// ✅ 금지어 검사 함수
function containsForbiddenWords(message) {
  const pattern = new RegExp(/forbiddenWords.join('|')/, 'i');
  return pattern.test(message);
}
// chatDB 연결
chatDB.once('open', async () => {
  try{
  console.log('✅ chatDB 연결 완료');
  const ChatLog = require('./models/ChatLog')(chatDB);
  const CustomerStatus = require('./models/CustomerStatus')(chatDB);
  const ForbiddenWord = require('./models/ForbiddenWord')(chatDB);

  const words = await ForbiddenWord.find();
  forbiddenWords = words.map(doc => doc.word);

  io.on('connection', (socket) => {
    console.log('📡 연결됨:', socket.id);

        // ✅ 고객 메시지 수신 처리
      socket.on('message-to-admin', async (msg) => {
        console.log('📥 고객 메시지 수신:', msg);
        console.log('👥 현재 연결된 관리자 수:', adminSockets.size);

        // ✅ 금지어 검사
        if (containsForbiddenWords(msg?.msg)) {
          socket.emit('warning', '⚠️ 금지된 단어 포함');
          return;
        }

        // ✅ 고객 상태 확인
        const status = await CustomerStatus.findOne({ userId: socket.userId });
        const customerId = status?.customerId;
        console.log('[디버그] customerId →', customerId);

        if (status && status.isEnded) return;

        // ✅ 로그 저장
        const newLog = await ChatLog.create({
          customerId,
          sender: 'customer',
          message: msg.msg,
          messageId: msg.messageId,
          read: false,
          time: new Date()
        });

        // ✅ 이름 확인
        const customerName = customerNames[socket.id] || status?.name || '고객';

        console.log('📤 관리자에게 emit 준비:', {
          customerId,
          name: customerName,
          msg: msg.msg
        });

        // ✅ emit 전에 adminSockets 상태 확인
        if (adminSockets.size === 0) {
          console.warn('⚠️ 현재 관리자 없음. 메시지 emit 실패 가능성 있음');
        }

        // ✅ emit 딜레이로 안정성 확보 (중요!)
        setTimeout(() => {
          adminSockets.forEach(admin => {
            admin.emit('message-from-customer', {
              customerId,
              name: customerName,
              msg: msg.msg,
              messageId: msg.messageId,
              time: newLog.time
            });
          });
          console.log('📤 emit 완료 → 관리자에게 메시지 전달됨');
        }, 10); // 10~20ms 딜레이
      });

      // ✅ 관리자 메시지 → 고객에게
      socket.on('message-to-customer', async ({ to, message, messageId }) => {
        const id = messageId || uuidv4();

        // 1. DB에서 customerStatus 조회
        const status = await CustomerStatus.findOne({ customerId: to });
        if (!status || status.isEnded) return;

        // 2. 로그 저장
        const newLog = await ChatLog.create({
          customerId: to,
          sender: 'admin',
          message,
          messageId: id,
          read: false,
          time: new Date()
        });

        // 3. 현재 접속 중인 socket.id 찾기
        const customerSocket = Object.entries(customers).find(([socketId, info]) => {
          return info.customerId === to;
        });

        if (customerSocket) {
          const [socketId, { socket }] = customerSocket;

          socket.emit('message-from-admin', {
            message,
            messageId: id,
            customerId: to,
            time: newLog.time
          });
        } else {
          console.warn('⚠️ 고객 socket 연결 안됨:', to);
        }
      });


    // ✅ join 처리
    socket.on('join', async (data) => {
      console.log('🟡 join 이벤트:', data);

      // ✅ 관리자일 경우
      if (data?.type === 'admin') {
        adminSockets.add(socket);
        socket.join('admin');
        console.log('🔵 관리자 접속:', socket.id);
        console.log('👥 현재 관리자 수:', adminSockets.size);

        const statuses = await CustomerStatus.find({ isEnded: false });
        const seen = new Set();
        statuses.forEach(status => {
          if (!seen.has(status.userId)) {
            seen.add(status.userId);
            socket.emit('new-customer', {
              id: status.customerId,
              name: status.name,
              userId: status.userId,
              isEnded: false
            });
          }
        });


        const logs = await ChatLog.find().sort({ time: 1 });
        const grouped = {};
        logs.forEach(log => {
          const id = log.customerId;
          if (!grouped[id]) grouped[id] = [];
          grouped[id].push({
            from: log.sender,
            message: log.message,
            read: log.read,
            id: log.messageId,
            time: log.time
          });
        });

        socket.emit('chat-history', grouped);
        socket.emit('update-forbidden-list', forbiddenWords);
      }

      // ✅ 고객일 경우
      else if (data?.type === 'customer') {
        const name = (data.name || '').trim();
        const userId = (data.userId || '').trim();

        if (!name || !userId) return;
        socket.userId = userId;
        // ✅ 기존 customerId가 있는지 확인
        let customerStatus = await CustomerStatus.findOne({ userId });

        if (!customerStatus) {
          // 새로 생성할 때만 socket.id 사용
          customerStatus = await CustomerStatus.create({
            customerId: socket.id,
            name,
            userId,
            isEnded: false,
            endedAt: null
          });
        } else {
          // ✅ 기존 customerId 유지! socket.id 덮지 마!
          customerStatus.name = name;
          customerStatus.isEnded = false;
          customerStatus.endedAt = null;
          await customerStatus.save();
        }

        const customerId = customerStatus.customerId;

        customers[socket.id] = {
          socket,
          customerId: customerStatus.customerId
        };
        customerNames[socket.id] = name;
        socket.emit('your-id', customerId);

        // ✅ 관리자에게 고객 정보 전달
        adminSockets.forEach(admin => {
          admin.emit('new-customer', {
            id: customerStatus.customerId,
            name,
            userId,
            isEnded: false
          });
        });


        // ✅ 기존 채팅 로그 전달
        const logs = await ChatLog.find({ customerId }).sort({ time: 1 });
        socket.emit('chat-history', logs);
      }
    });


    // ✅ 메시지 읽음 처리
    socket.on('message-read', async ({ customerId, messageIds }) => {
      await ChatLog.updateMany(
        { customerId, messageId: { $in: messageIds } },
        { $set: { read: true } }
      );
      const updatedLogs = await ChatLog.find({ customerId }).sort({ time: 1 });

      adminSockets.forEach(admin => {
        admin.emit('chat-history', {
          [customerId]: updatedLogs.map(log => ({
            from: log.sender,
            message: log.message,
            read: log.read,
            id: log.messageId,
            time: log.time
          }))
        });
      });
      if (customers[customerId]) {
        customers[customerId].emit('chat-history', updatedLogs);
      }
    });

    // ✅ 문의 종료
    socket.on('end-inquiry', async () => {
      const id = socket.id;
      await CustomerStatus.findOneAndUpdate(
        { customerId: id },
        { isEnded: true, endedAt: new Date() }
      );
      adminSockets.forEach(admin => {
        admin.emit('inquiry-ended', id);
      });
      delete customers[id];
      delete customerNames[id];
      socket.disconnect();
    });

    // ✅ 금지어 추가
    socket.on('add-forbidden-word', async (word) => {
      const clean = word.trim();
      if (!clean) return;
      try {
        const existing = await ForbiddenWord.findOne({ word: clean });
        if (!existing) {
          await ForbiddenWord.create({ word: clean });
          forbiddenWords.push(clean);
        }
      } catch (e) {
        console.error('❌ 금지어 추가 실패:', e);
      }
      io.emit('update-forbidden-list', forbiddenWords);
    });

    // ✅ 금지어 삭제
    socket.on('remove-forbidden-word', async (word) => {
      try {
        await ForbiddenWord.deleteOne({ word });
        forbiddenWords = forbiddenWords.filter(w => w !== word);
        io.emit('update-forbidden-list', forbiddenWords);
      } catch (e) {
        console.error('❌ 금지어 삭제 실패:', e);
      }
    });

    // ✅ 연결 해제 처리
    socket.on('disconnect', () => {
      const disconnectedUser = customers[socket.id];
      if (disconnectedUser) {
        const customerId = disconnectedUser.customerId;
        delete customers[socket.id];
        delete customerNames[socket.id];
        adminSockets.forEach(admin => {
          admin.emit('customer-disconnected', customerId);
        });
      }
      if (adminSockets.has(socket)) {
        adminSockets.delete(socket);
        console.log('🛑 관리자 연결 해제:', socket.id);
      }
    });
  });
} catch(err) {
  console.error('❌ chatDB 연결 실패:', err);
}
});

// 미들웨어
app.use(express.urlencoded({extended: true}));
app.use(express.json());  // JSON 전송용(추가)
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false   // HTTPS가 아닌 로컬환경일 경우 false여야 작동함
  }
}));
app.use((req, res, next) => {
  console.log(`📡 요청 수신됨: ${req.method} ${req.url}`);
  next();
});

// API 라우터
app.use(express.static('public'));
app.use('/api/users', userRoutes);

app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes); 

// 정적 파일
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/css', express.static(path.join(__dirname, 'Css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/html', express.static(path.join(__dirname, 'Html')));
app.use('/admin', express.static(path.join(__dirname, 'Html', 'admin')));
app.use('/top', express.static(path.join(__dirname, 'Html', 'top'))); // 정적으로 처리 -> top 파일 안의 html 자동으로 매핑
app.use('/bottom', express.static(path.join(__dirname, 'Html', 'bottom'))); // 정적으로 처리 -> bottom 파일 안의 html 자동으로 매핑
app.use('/dress', express.static(path.join(__dirname, 'Html', 'dress'))); // 정적으로 처리 -> dress 파일 안의 html 자동으로 매핑
app.use('/outerwear', express.static(path.join(__dirname, 'Html', 'outerwear'))); // 정적으로 처리 -> outerwear 파일 안의 html 자동으로 매핑
app.use('/skirt', express.static(path.join(__dirname, 'Html', 'skirt'))); // 정적으로 처리 -> skirt 파일 안의 html 자동으로 매핑
app.use('/', express.static(path.join(__dirname, 'Html'))); // 정적으로 처리 -> Html 파일 안의 html

// 페이지 라우팅
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일 없음' });
  res.json({ url: `/uploads/${req.file.filename}` });
});
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, productId, quantity, status, product } = req.body;
    console.log("📦 product.title in server:", product?.title);
    if (!userId || !productId) {
      return res.status(400).json({ message: '필수값 누락' });
    }
    console.log("✅ 저장될 상품명:", product?.title); // 콘솔 찍어서 디버깅 확인
    const sql = `
      INSERT INTO orders (user_id, product_id, quantity, status, product_title, product_image)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [
      userId,
      productId,
      quantity,
      status,
      product?.title || '',    // ✅ product_title 저장!
      product?.image || ''
    ];
    await db.execute(sql, values);
    res.status(201).json({ message: '주문 저장 완료' });
  } catch (err) {
    console.error('❌ 주문 저장 오류:', err.message);
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Html', 'home.html'));
});
app.get('/api/orders/:userId', async (req, res) => {
  const orders = await Order.find({ userId: req.params.userId });
  res.json(orders);
});
app.get('/api/orders', async (req, res) => {
  const orders = await Models.Order.find(); // ✅ Models에서 가져오기
  res.json(orders);
});

app.get('/api/wishlist/:userId', async (req, res) => {
  const { userId } = req.params;
  const wishlist = await Models.Wishlist.find({ userId }); // ✅
  res.json(wishlist);
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'Html', 'admin', 'admin.html'));
});
app.get('/admin/manage-products', (req, res) => {
  res.sendFile(path.join(__dirname, 'Html', 'admin', 'manage-products.html'));
});