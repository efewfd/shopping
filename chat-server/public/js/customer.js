// ✅ 전역 socket 선언
const socket = io();

document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  let myId = null;
  let name = prompt('이름을 입력해주세요') || '익명';
  socket.emit('join', { type: 'customer', name });

  socket.on('your-id', (id) => {
    myId = id;
  });

  function sendMsg() {
    const input = document.getElementById('msgInput');
    const msg = input.value.trim();
    if (!msg) return;

    const messageId = crypto.randomUUID();
    socket.emit('message-to-admin', { msg, messageId });
    appendMsg('나', msg, new Date());
    input.value = '';
  }

  socket.on('message-from-admin', ({ message, time }) => {
    appendMsg('관리자', message, time);
  });

  function appendMsg(from, msg, time) {
    const div = document.createElement('div');
    const timeStr = new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.textContent = `[${from}] ${msg} (${timeStr})`;
    div.classList.add(from === '나' ? 'customer' : 'admin');

    const chat = document.getElementById('chat');
    if (chat) {
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    } else {
      console.error("❌ 'chat' 요소를 찾을 수 없습니다.");
    }
  }

  document.getElementById('sendBtn').addEventListener('click', sendMsg);
  document.getElementById('msgInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMsg();
    }
  });
});


// ✅ 고객 나가기 기능 (DOM 밖에 있어도 socket 접근 가능)
function leaveChat() {
  if (confirm('상담을 종료하시겠습니까?')) {
    socket.emit('end-inquiry');
    document.getElementById('chat').innerHTML = '<div>상담이 종료되었습니다.</div>';
    document.getElementById('msgInput').disabled = true;
    document.getElementById('sendBtn').disabled = true;
  }
}

// ✅ 관리자 삭제 요청
function deleteCustomer(id) {
  if (confirm('이 채팅방을 삭제하고 DB에서도 지우시겠습니까?')) {
    socket.emit('delete-customer', id);
  }
}
