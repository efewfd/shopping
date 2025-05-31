const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const { ChatLog, CustomerStatus } = require('./models');

let adminSockets = new Set();
const customers = {};

app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb+srv://wsx03sd:jayoung038@cluster0.khjefrp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {}).then(() => {
  console.log('✅ MongoDB 연결 완료');
  server.listen(3001, () => console.log('✅ 서버 실행 중: http://localhost:3001'));

  io.on('connection', (socket) => {
    console.log('📡 연결됨:', socket.id);

    socket.on('delete-customer', async (id) => {
      const customerId = String(id);
      await ChatLog.deleteMany({ customerId });
      await CustomerStatus.deleteOne({ customerId });
      io.emit('customer-deleted', customerId);
      console.log('🧼 DB에서 삭제됨:', customerId);
    });



    socket.on('join', async (data) => {
      if (data?.type === 'admin') {
        socket.role = 'admin';
        adminSockets.add(socket);
        console.log('🔵 관리자 접속:', socket.id);

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
          if (!grouped[log.customerId]) grouped[log.customerId] = [];
          grouped[log.customerId].push(log);
        });

        socket.emit('chat-history', grouped);
      }

      if (data?.type === 'customer') {
        customers[socket.id] = socket;
        await CustomerStatus.findOneAndUpdate(
          { customerId: socket.id },
          { name: data.name, isEnded: false },
          { upsert: true }
        );
        adminSockets.forEach(admin => {
          admin.emit('new-customer', { id: socket.id, name: data.name, isEnded: false });
        });
      }
    });

    socket.on('message-to-admin', async ({ msg, messageId }) => {
      const log = await ChatLog.create({
        customerId: socket.id,
        sender: 'customer',
        message: msg,
        messageId,
        read: false,
        time: new Date()
      });
      adminSockets.forEach(admin => {
        admin.emit('message-from-customer', {
          customerId: socket.id,
          msg,
          messageId,
          time: log.time
        });
      });
    });

    socket.on('message-to-customer', async ({ to, message, messageId }) => {
      await ChatLog.create({
        customerId: to,
        sender: 'admin',
        message,
        messageId,
        read: false,
        time: new Date()
      });
      io.to(to).emit('message-from-admin', { message, messageId });
    });

    socket.on('disconnect', () => {
      if (socket.role === 'admin') {
        adminSockets.delete(socket);
        console.log('🛑 관리자 해제:', socket.id);
      }
    });
  });
});


