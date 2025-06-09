// ✅ Socket.IO 연결 시작
const socket = io();

// ✅ 관리자 소켓 연결 후 join 이벤트 보내기
socket.on('connect', () => {
  console.log('✅ 관리자 소켓 연결됨:', socket.id);
  socket.emit('join', { type: 'admin' });
});
// ✅ 고객 메시지 수신 이벤트는 socket 연결 전에 먼저 등록
socket.on('message-from-customer', ({ customerId, name, msg, messageId, time }) => {
  console.log('✅ 관리자 화면 수신:', customerId, msg);

  if (name) customerNames[customerId] = name;

  const exists = allCustomers.find(c => c.id === customerId);
  if (!exists) {
    allCustomers.push({ id: customerId, name: customerNames[customerId] || customerId, isEnded: false });
  }

  chatLogs[customerId] = chatLogs[customerId] || [];
  const alreadyExists = chatLogs[customerId].some(m => m.id === messageId);
  if (!alreadyExists) {
    chatLogs[customerId].push({ from: 'customer', message: msg, id: messageId, read: false, time });
  }

  if (selectedCustomer === customerId) {
    renderChat(customerId);
    insertDateBubbleFromLogs(customerId);

    const unread = chatLogs[customerId].filter(m => m.from !== 'admin' && !m.read);
    const unreadIds = unread.map(m => m.id);
    if (unreadIds.length) {
      socket.emit('message-read', { customerId, messageIds: unreadIds });
    }

    hasNewMsg[customerId] = false;
  } else {
    hasNewMsg[customerId] = true;
    const idx = allCustomers.findIndex(c => c.id === customerId);
    if (idx !== -1) {
      const [moved] = allCustomers.splice(idx, 1);
      allCustomers.unshift(moved);
    }
  }

  renderCustomerList();
});

// ✅ DOM 요소 가져오기
const activeDiv = document.getElementById('active-customers');
const endedDiv = document.getElementById('ended-customers');
const input = document.getElementById('msgInput');
const chatDiv = document.getElementById('chat');
const activeBtn = document.getElementById('activeBtn');
const endedBtn = document.getElementById('endedBtn');
const banInput = document.getElementById('banInput');
const banList = document.getElementById('banList');

// ✅ 전역 상태 변수
let selectedCustomer = null;
const chatLogs = {};
const customerNames = {};
const hasNewMsg = {};
const allCustomers = [];
let forbiddenWords = [];
const renderedMsgIds = new Set();
const customerUserIds = {}; // ✅ userId 저장용


// ✅ 메시지 전송 처리
function sendMsg() {
  const msg = input.value;
  if (msg && selectedCustomer) {
    const customer = allCustomers.find(c => c.id === selectedCustomer);
    if (customer?.isEnded) return;

    if (containsForbiddenWords(msg)) {
      alert('⚠️ 금지된 단어가 포함되어 있어 메시지를 보낼 수 없습니다.');
      return;
    }

    const msgId = crypto.randomUUID();
    const now = new Date();

    socket.emit('message-to-customer', { to: selectedCustomer, message: msg, messageId: msgId });

    chatLogs[selectedCustomer] = chatLogs[selectedCustomer] || [];
    chatLogs[selectedCustomer].push({ from: 'admin', message: msg, id: msgId, read: false, time: now });

    appendMsg(msg, true, false, msgId, now);
    insertDateBubbleFromLogs(selectedCustomer);
    input.value = '';
  }
}

// ✅ chat-history 수신 처리
socket.on('chat-history', (data) => {
  renderedMsgIds.clear();
  for (const id in data) {
    chatLogs[id] = data[id].map(log => ({
      from: log.sender || log.from || 'customer',
      // from: log.from || log.sender,
      message: log.message,
      read: log.read,
      id: log.id || log.messageId,
      time: log.time
    }));

    if (!customerNames[id]) customerNames[id] = id;

    const exists = allCustomers.find(c => c.id === id);
    if (!exists) {
      allCustomers.push({ id, name: customerNames[id], isEnded: false });
    }

    hasNewMsg[id] = chatLogs[id].some(log => log.from === 'customer' && !log.read);
  }

  renderCustomerList();

  if (selectedCustomer && chatLogs[selectedCustomer]) {
    renderChat(selectedCustomer);
    insertDateBubbleFromLogs(selectedCustomer);
  }
});

// ✅ 금지어 포함 여부 검사
function containsForbiddenWords(message) {
  if (!Array.isArray(forbiddenWords) || forbiddenWords.length === 0) return false;
  const pattern = new RegExp(forbiddenWords.join('|'), 'i');
  return pattern.test(message);
}

// ✅ 시간 포맷 함수
function formatTime(timeString) {
  const date = new Date(timeString);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? '오후' : '오전';
  const hour12 = hours % 12 || 12;
  return `${period} ${hour12}:${minutes}`;
}

// ✅ 말풍선 출력 함수
function appendMsg(msg, fromAdmin = false, read = false, id = '', time = null) {
  // ✅ 중복 필터 제거 → 무조건 append 하도록 수정
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

  if (fromAdmin) {
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
    wrapper.appendChild(meta);
    wrapper.appendChild(bubble);
  } else {
    wrapper.appendChild(bubble);
    wrapper.appendChild(meta);
  }

  div.appendChild(wrapper);
  chatDiv.appendChild(div);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

// ✅ 날짜 말풍선
function insertDateBubbleFromLogs(customerId) {
  if (!chatDiv || chatDiv.querySelector('.date-bubble')) return;
  const logs = chatLogs[customerId];
  if (!logs || logs.length === 0) return;

  const first = new Date(logs[0].time);
  const yyyy = first.getFullYear();
  const mm = String(first.getMonth() + 1).padStart(2, '0');
  const dd = String(first.getDate()).padStart(2, '0');
  const dateDiv = document.createElement('div');
  dateDiv.classList.add('date-bubble');
  dateDiv.textContent = `${yyyy}.${mm}.${dd}`;
  chatDiv.prepend(dateDiv);
}

// ✅ 전체 채팅 렌더링
function renderChat(id = selectedCustomer) {
  renderedMsgIds.clear();
  chatDiv.innerHTML = '';
  const logs = chatLogs[id] || [];
  logs.forEach(({ from, message, read, id, time }) => {
    const isFromAdmin = from === 'admin';
    appendMsg(message, isFromAdmin, read, id, time);
  });
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

// ✅ 고객 선택
function selectCustomer(id) {
  selectedCustomer = id;

  const selected = allCustomers.find(c => c.id === id);
  input.disabled = selected?.isEnded;

// 모든 버튼에서 선택 제거
document.querySelectorAll('.customer-list button').forEach(b => {
  b.classList.remove('selected');
});

// 현재 선택된 버튼에 selected 클래스 추가
const btn = document.querySelector(`button[data-id="${id}"]`);
if (btn) btn.classList.add('selected');

  if (btn) {
    const dot = btn.querySelector('.user-alert');
    if (dot) btn.removeChild(dot);
  }

  hasNewMsg[id] = false;
  renderChat(id);
  insertDateBubbleFromLogs(id);

  const unread = chatLogs[id]?.filter(msg => msg.from !== 'admin' && !msg.read) || [];
  const unreadIds = unread.map(msg => msg.id);
  if (unreadIds.length) {
    socket.emit('message-read', { customerId: id, messageIds: unreadIds });
  }
}

// ✅ 고객 목록
function renderCustomerList() {
  activeDiv.innerHTML = '';
  endedDiv.innerHTML = '';

  allCustomers.forEach(({ id, name, isEnded }) => {
    const btn = document.createElement('button');
    const displayUserId = customerUserIds[id] || 'guest';
    btn.textContent = `${name} (${displayUserId.slice(0, 6)})`;
    btn.dataset.id = id;
    btn.onclick = () => selectCustomer(id);

    if (hasNewMsg[id] && !isEnded) {
      const dot = document.createElement('span');
      dot.className = 'user-alert';
      btn.appendChild(dot);
    }

    if (isEnded) {
      endedDiv.appendChild(btn);
    } else {
      activeDiv.appendChild(btn);
    }
  });

  if (activeDiv.style.display !== 'none') activeDiv.scrollTop = activeDiv.scrollHeight;
  if (endedDiv.style.display !== 'none') endedDiv.scrollTop = endedDiv.scrollHeight;
}

// ✅ 새 고객 접속
socket.on('new-customer', ({ id, name, userId, isEnded = false }) => {
  console.log('🟢 new-customer 수신:', id, name, userId);
  customerNames[id] = name;
  customerUserIds[id] = userId; // ✅ 추가

  chatLogs[id] = chatLogs[id] || [];

  const exists = allCustomers.find(c => c.id === id);
  if (!exists) {
    allCustomers.push({ id, name, userId, isEnded }); // ✅ userId 포함
  }

  renderCustomerList();
});


// ✅ 종료 처리
socket.on('inquiry-ended', (id) => {
  showToast(customerNames[id] + '님이 채팅을 종료했습니다.');

  const msg = document.createElement('div');
  msg.classList.add('chat-msg', 'end-msg');
  msg.textContent = '📢 ' + customerNames[id] + '님이 채팅을 종료했습니다.';
  chatDiv.appendChild(msg);
  chatDiv.scrollTop = chatDiv.scrollHeight;

  if (selectedCustomer === id) input.disabled = true;

  const customer = allCustomers.find(c => c.id === id);
  if (customer) customer.isEnded = true;

  renderCustomerList();
});

// ✅ 금지어 목록 갱신
socket.on('update-forbidden-list', (list) => {
  forbiddenWords = list;
  if (!banList) return;
  banList.innerHTML = '';
  list.forEach(word => {
    const li = document.createElement('li');
    li.textContent = word;

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.onclick = () => socket.emit('remove-forbidden-word', word);
    delBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.41L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/>
      </svg>`;
    li.appendChild(delBtn);
    banList.appendChild(li);
  });
});

// ✅ 금지어 추가
function addForbidden() {
  const word = banInput.value.trim();
  if (!word) return;
  socket.emit('add-forbidden-word', word);
  banInput.value = '';
}

// ✅ 탭 전환
activeBtn.addEventListener('click', () => {
  activeDiv.style.display = 'flex';
  endedDiv.style.display = 'none';
  activeBtn.classList.add('active');
  endedBtn.classList.remove('active');
});

endedBtn.addEventListener('click', () => {
  activeDiv.style.display = 'none';
  endedDiv.style.display = 'flex';
  activeBtn.classList.remove('active');
  endedBtn.classList.add('active');
});

// ✅ Enter 키로 메시지 전송
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMsg();
  }
});

// ✅ 토스트 메시지
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = '#333';
  toast.style.color = '#fff';
  toast.style.padding = '10px 16px';
  toast.style.borderRadius = '8px';
  toast.style.fontSize = '14px';
  toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  toast.style.zIndex = 9999;
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s ease';
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}
