// ✅ admin.js

const socket = io();

// ✅ 관리자 연결 시 join
socket.emit('join', { type: 'admin' });

// ✅ 관리자 연결 확인
socket.on('connect', () => {
  console.log('✅ 관리자 연결됨:', socket.id);
});

// ✅ 고객 목록 및 채팅 상태
let selectedCustomer = null;
const chatLogs = {};
const customerNames = {};
const unreadCounts = {};

const chatBox = document.getElementById('chat');
const chatTitle = document.getElementById('chatTitle');
const input = document.getElementById('msgInput');
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMsg();
  }
});

function formatTime(timeStr) {
  const date = new Date(timeStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ✅ 고객 선택 시 채팅 로딩
function selectCustomer(id) {
  selectedCustomer = id;
  unreadCounts[id] = 0;
  updateCustomerList();
  chatTitle.textContent = `${customerNames[id]}님과의 상담`;
  renderChat(id);
  socket.emit('message-read', { customerId: id });
}

// ✅ 전체 채팅 그리기
function renderChat(id) {
  chatBox.innerHTML = '';
  (chatLogs[id] || []).forEach(({ sender, message, time }) => {
    const div = document.createElement('div');
    div.textContent = `[${sender}] ${message} (${formatTime(time)})`;

    // ✅ 말풍선 위치 class 지정
    div.classList.add(sender === 'admin' ? 'admin' : 'customer');

    chatBox.appendChild(div);
  });
}


// ✅ 전송
function sendMsg() {
  const msg = input.value;
  if (!msg || !selectedCustomer) return;
  const messageId = crypto.randomUUID();
  const time = new Date();
  socket.emit('message-to-customer', {
    to: selectedCustomer,
    message: msg,
    messageId
  });
  chatLogs[selectedCustomer] = chatLogs[selectedCustomer] || [];
  chatLogs[selectedCustomer].push({ sender: 'admin', message: msg, time });
  renderChat(selectedCustomer);
  input.value = '';
}

function updateCustomerList() {
  const container = document.getElementById('active-customers');
  container.innerHTML = '';
  for (const id in customerNames) {
    const name = customerNames[id];
    const nameBtn = document.createElement('button');
    nameBtn.textContent = `${name} (${id.slice(0, 4)})`;
    nameBtn.dataset.id = id;
    nameBtn.onclick = () => selectCustomer(id);

    if (unreadCounts[id] > 0) {
      const badge = document.createElement('span');
      badge.textContent = unreadCounts[id];
      badge.style.marginLeft = '6px';
      badge.style.color = 'red';
      nameBtn.appendChild(badge);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '❌';
    deleteBtn.className = 'delete-customer';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteCustomer(id);
    };

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '6px';
    wrapper.appendChild(nameBtn);
    wrapper.appendChild(deleteBtn);

    container.appendChild(wrapper);
  }
}

// ✅ 고객 목록 수신
socket.on('new-customer', ({ id, name }) => {
  customerNames[id] = name;
  chatLogs[id] = chatLogs[id] || [];
  unreadCounts[id] = 0;
  updateCustomerList();
});

// ✅ 이전 채팅 불러오기
socket.on('chat-history', (data) => {
  for (const id in data) {
    chatLogs[id] = data[id].map(log => ({
      sender: log.sender,
      message: log.message,
      time: log.time
    }));
  }
  updateCustomerList();
});

// ✅ 고객 메시지 수신
socket.on('message-from-customer', ({ customerId, msg, messageId, time }) => {
  chatLogs[customerId] = chatLogs[customerId] || [];
  chatLogs[customerId].push({ sender: 'customer', message: msg, time });
  if (customerId === selectedCustomer) {
    renderChat(customerId);
    socket.emit('message-read', { customerId });
  } else {
    unreadCounts[customerId] = (unreadCounts[customerId] || 0) + 1;
  }
  updateCustomerList();
});

socket.on('customer-deleted', (id) => {
  removeCustomerUI(id);
});

function deleteCustomer(id) {
  if (confirm('이 채팅방을 삭제하시겠습니까?')) {
    socket.emit('delete-customer', id);
    removeCustomerUI(id);
  }
}

function removeCustomerUI(id) {
  delete chatLogs[id];
  delete customerNames[id];
  delete unreadCounts[id];
  if (selectedCustomer === id) {
    selectedCustomer = null;
    chatBox.innerHTML = '';
    chatTitle.textContent = '고객 채팅';
  }
  updateCustomerList();
}
