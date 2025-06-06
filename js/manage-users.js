// 페이지 로딩 시 전체 회원 목록 불러오기
window.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('/api/users/all');
  const users = await res.json();
  const tbody = document.querySelector('#user-table tbody');

  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.user_id}</td>
      <td>${user.name || '-'}</td>
      <td>${user.email || '-'}</td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
      <td>
        <button 
          class="${user.is_active ? 'lock-btn' : 'unlock-btn'}" 
          onclick="${user.is_active ? `deactivateUser('${user.user_id}')` : `activateUser('${user.user_id}')`}">
          ${user.is_active ? '잠금' : '해제'}
        </button>
        <button class="delete-btn" onclick="deleteUser('${user.user_id}')">삭제</button>
        <button class="delete-btn" onclick="deleteUser('${user.user_id}')">삭제</button>
      </td>

    `;
    tbody.appendChild(row);
  });
});


// 계정 삭제 함수
async function deleteUser(userId) {
  const confirmed = confirm(`${userId} 계정을 삭제하시겠습니까?`);
  if (!confirmed) return;

  await fetch('/api/users/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });

  alert('삭제 완료');
  window.location.reload();
}

// 계정 잠금 함수
async function deactivateUser(userId) {
  const confirmed = confirm(`${userId} 계정을 잠금 처리하시겠습니까?`);
  if (!confirmed) return;

  await fetch('/api/users/deactivate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });

  alert('잠금 완료');
  window.location.reload();
}

// 계정 잠금 해제 함수
async function activateUser(userId) {
  const confirmed = confirm(`${userId} 계정을 잠금 해제하시겠습니까?`);
  if (!confirmed) return;

  await fetch('/api/auth/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });

  alert('잠금 해제 완료');
  window.location.reload();
}