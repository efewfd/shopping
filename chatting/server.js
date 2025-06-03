const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

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

// ✅ 이미지 업로드 라우터
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일 없음' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ✅ MongoDB 스키마 정의
const chatSchema = new mongoose.Schema({
  customerId: String,
  sender: String,
  message: String,
  messageId: String,
  read: { type: Boolean, default: false },
  time: { type: Date, default: Date.now }
});
const ChatLog = mongoose.model('ChatLog', chatSchema);

const customerStatusSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  isEnded: { type: Boolean, default: false },
  endedAt: { type: Date, default: null }
});
const CustomerStatus = mongoose.model('CustomerStatus', customerStatusSchema);

const forbiddenWordSchema = new mongoose.Schema({
  word: { type: String, required: true, unique: true }
});
const ForbiddenWord = mongoose.model('ForbiddenWord', forbiddenWordSchema);

// ✅ 전역 상태 변수
const customers = {};
const customerNames = {};
let adminSockets = new Set(); // 🔥 여러 관리자 또는 재접속 대비
let forbiddenWords = [];

// ✅ 금지어 검사 함수
function containsForbiddenWords(message) {
  const pattern = new RegExp(/forbiddenWords.join('|')/, 'i');
  return pattern.test(message);
}

// ✅ MongoDB 연결 및 서버/소켓 초기화
mongoose.connect(
  'mongodb+srv://cd1:capstonedesign1@cluster0.snijqi4.mongodb.net/chatdb?retryWrites=true&w=majority&appName=Cluster0', {}
).then(async () => {
  console.log('✅ MongoDB 연결 완료');

  const words = await ForbiddenWord.find();
  forbiddenWords = words.map(doc => doc.word);

  server.listen(3000, () => {
    console.log('✅ 서버 실행 중: http://localhost:3000');
  });

  io.on('connection', (socket) => {
    console.log('📡 연결됨:', socket.id);

    // ✅ join 처리
    socket.on('join', async (data) => {
      console.log('🟡 join 이벤트:', data);

      if (data?.type === 'admin') {
        adminSockets.add(socket); // ✅ 관리자 소켓 등록
        socket.join('admin');
        console.log('🔵 관리자 접속:', socket.id);
        console.log('👥 현재 관리자 수:', adminSockets.size);

        const statuses = await CustomerStatus.find();
        statuses.forEach(status => {
          socket.emit('new-customer', {
            id: status.customerId,
            name: status.name,
            isEnded: status.isEnded
          });
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

      else if (data?.type === 'customer') {
        const name = (data.name || '').trim();
        if (!name) return;

        customers[socket.id] = socket;
        customerNames[socket.id] = name;
        socket.emit('your-id', socket.id);

        await CustomerStatus.findOneAndUpdate(
          { customerId: socket.id },
          { name, isEnded: false, endedAt: null },
          { upsert: true }
        );

        // ✅ 관리자에게 고객 목록 전송
        adminSockets.forEach(admin => {
          admin.emit('new-customer', { id: socket.id, name, isEnded: false });
        });

        const logs = await ChatLog.find({ customerId: socket.id }).sort({ time: 1 });
        socket.emit('chat-history', logs);
      }
    });

    // ✅ 고객 메시지 수신 처리
    socket.on('message-to-admin', async (msg) => {
      console.log('📥 고객 메시지 수신:', msg);
      console.log('👥 현재 연결된 관리자 수:', adminSockets.size); // ✅ emit 대상 확인

      if (containsForbiddenWords(msg.msg)) {
        socket.emit('warning', '⚠️ 금지된 단어 포함');
        return;
      }

      const status = await CustomerStatus.findOne({ customerId: socket.id });

      if (status && status.isEnded) return;

      const newLog = await ChatLog.create({
        customerId: socket.id,
        sender: 'customer',
        message: msg.msg,
        messageId: msg.messageId,
        read: false,
        time: new Date()
      });

      const customerName = customerNames[socket.id] || status?.name || '고객';

      console.log('📤 관리자에게 emit 중:', {
        customerId: socket.id,
        name: customerName,
        msg: msg.msg
      });

      adminSockets.forEach(admin => {
        admin.emit('message-from-customer', {
          customerId: socket.id,
          name: customerName,
          msg: msg.msg,
          messageId: msg.messageId,
          time: newLog.time
        });
      });
    });

    // ✅ 관리자 메시지 → 고객에게
    socket.on('message-to-customer', async ({ to, message, messageId }) => {
      const id = messageId || uuidv4();
      const status = await CustomerStatus.findOne({ customerId: to });
      if (status?.isEnded) return;

      const newLog = await ChatLog.create({
        customerId: to,
        sender: 'admin',
        message,
        messageId: id,
        read: false,
        time: new Date()
      });

      if (customers[to]) {
        customers[to].emit('message-from-admin', {
          message,
          messageId: id,
          customerId: to,
          time: newLog.time
        });
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
      if (customers[socket.id]) {
        delete customers[socket.id];
        delete customerNames[socket.id];
        adminSockets.forEach(admin => {
          admin.emit('customer-disconnected', socket.id);
        });
      }

      if (adminSockets.has(socket)) {
        adminSockets.delete(socket);
        console.log('🛑 관리자 연결 해제:', socket.id);
      }
    });
  });
}).catch(err => {
  console.error('❌ MongoDB 연결 실패:', err);
});
