// ✅ Socket.IO로 서버와 실시간 연결 시작
const socket = io();
const chat = document.getElementById('chat');
const input = document.getElementById('msgInput');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');

let myId = '';
let forbiddenWords = [];

socket.on('your-id', (id) => {
   myId = id;
});

socket.on('update-forbidden-list', (list) => {
   forbiddenWords = list;
});

let userName = '';
while (!userName.trim()) {
   userName = prompt('이름을 입력해주세요');
   if (userName === null) {
      alert('상담을 이용하시려면 이름을 입력해야 합니다.');
      window.location.href = '/';
      throw new Error('이름 입력 없음으로 채팅 종료');
   }
}

socket.emit('join', { type: 'customer', name: userName });

function containsForbiddenWords(message) {
   if (!Array.isArray(forbiddenWords) || forbiddenWords.length === 0) return false;
   const pattern = new RegExp(forbiddenWords.join('|'), 'i');
   return pattern.test(message);
}

function formatTime(timeString) {
   const date = new Date(timeString);
   const hours = date.getHours();
   const minutes = String(date.getMinutes()).padStart(2, '0');
   const period = hours >= 12 ? '오후' : '오전';
   const hour12 = hours % 12 || 12;
   return `${period} ${hour12}:${minutes}`;
}

const renderedMsgIds = new Set();

function appendMsg(msg, fromAdmin = false, read = false, id = '', time = null) {
   if (id && renderedMsgIds.has(id)) {
      // ✅ 이미 렌더링된 메시지의 읽음 상태만 업데이트
      const existing = document.querySelector(`.chat-msg[data-id="${id}"] .read-status`);
      if (existing && read) existing.textContent = '✔️';
      return;
   }
   if (id) renderedMsgIds.add(id);

   const div = document.createElement('div');
   div.classList.add('chat-msg', fromAdmin ? 'admin' : 'customer');
   if (id) div.dataset.id = id;

   const wrapper = document.createElement('div');
   wrapper.classList.add('msg-wrapper');

   const bubble = document.createElement('span');
   bubble.classList.add('msg-bubble');
   bubble.innerHTML = msg;

   const meta = document.createElement('span');
   meta.classList.add('msg-meta');

   if (!fromAdmin) {
      const readSpan = document.createElement('span');
      readSpan.classList.add('read-status');
      readSpan.textContent = read ? '✔️' : '⌛';
      meta.appendChild(readSpan);
   }

   const timeSpan = document.createElement('span');
   timeSpan.classList.add('msg-time');
   if (time) timeSpan.textContent = formatTime(time);
   meta.appendChild(timeSpan);

   if (fromAdmin) {
      wrapper.appendChild(bubble);
      wrapper.appendChild(meta);
   } else {
      wrapper.appendChild(meta);
      wrapper.appendChild(bubble);
   }

   div.appendChild(wrapper);
   chat.appendChild(div);
   chat.scrollTop = chat.scrollHeight;
}

function insertDateBubbleToday() {
   if (chat.querySelector('.date-bubble')) return;

   const today = new Date();
   const yyyy = today.getFullYear();
   const mm = String(today.getMonth() + 1).padStart(2, '0');
   const dd = String(today.getDate()).padStart(2, '0');
   const formattedDate = `${yyyy}.${mm}.${dd}`;

   const dateDiv = document.createElement('div');
   dateDiv.classList.add('date-bubble');
   dateDiv.textContent = formattedDate;
   chat.prepend(dateDiv);
}

function insertDateBubbleFromLogs(logs) {
   if (!logs || logs.length === 0) return;
   if (chat.querySelector('.date-bubble')) return;

   const firstLog = logs[0];
   const date = firstLog.time ? new Date(firstLog.time) : new Date();
   const yyyy = date.getFullYear();
   const mm = String(date.getMonth() + 1).padStart(2, '0');
   const dd = String(date.getDate()).padStart(2, '0');
   const formattedDate = `${yyyy}.${mm}.${dd}`;

   const dateDiv = document.createElement('div');
   dateDiv.classList.add('date-bubble');
   dateDiv.textContent = formattedDate;
   chat.prepend(dateDiv);
}

function sendMsg() {
   const msg = input.value;
   if (msg) {
      if (containsForbiddenWords(msg)) {
         alert('⚠️ 금지된 단어가 포함되어 있어 메시지를 보낼 수 없습니다.');
         return;
      }

      const messageId = crypto.randomUUID();
      const now = new Date();

      appendMsg(msg, false, false, messageId, now);
      socket.emit('message-to-admin', { msg, messageId });

      input.value = '';
   }
}

uploadBtn.addEventListener('click', () => {
   fileInput.click();
});

fileInput.addEventListener('change', async () => {
   const file = fileInput.files[0];
   if (!file) return;

   const formData = new FormData();
   formData.append('image', file);

   try {
      const res = await fetch('/upload', {
         method: 'POST',
         body: formData
      });
      const data = await res.json();
      if (data.url) {
         const imgTag = `<img src="${data.url}" alt="image" style="max-width:200px;" />`;
         const messageId = crypto.randomUUID();
         const now = new Date();
         appendMsg(imgTag, false, false, messageId, now);
         socket.emit('message-to-admin', { msg: imgTag, messageId });
      }
   } catch (err) {
      console.error('업로드 실패', err);
      alert('이미지 업로드 실패');
   }

   fileInput.value = '';
});

function endInquiry() {
   if (confirm('정말 문의를 종료하시겠습니까?')) {
      socket.emit('end-inquiry');
      chat.innerHTML = '';
      input.disabled = true;
      alert('문의가 종료되었습니다.');
      socket.disconnect();
   }
}

socket.on('message-from-admin', ({ message, messageId, customerId, time }) => {
   appendMsg(message, true, false, messageId, time);
   socket.emit('message-read', {
      customerId,
      messageIds: [messageId]
   });
});

socket.on('chat-history', (logs) => {
   logs.forEach(log => {
      const isFromAdmin = (log.sender || log.from) === 'admin';
      appendMsg(log.message, isFromAdmin, log.read, log.messageId, log.time);
   });

   if (logs.length === 0) {
      insertDateBubbleToday();
   } else {
      insertDateBubbleFromLogs(logs);
   }
});

// input.addEventListener('keydown', e => {
//    if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       sendMsg();
//    }
// });
document.addEventListener('DOMContentLoaded', () => {
   const input = document.getElementById('msgInput');
   input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         sendMsg();
      }
   });
});
