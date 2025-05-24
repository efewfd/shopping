window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/auth/user');
    const data = await res.json();

    const listbar = document.querySelector('.listbar');
    if (!listbar) return;

    if (data.loggedIn) {
      // 로그인 상태: 로그아웃 버튼 표시
      listbar.innerHTML = `
        <li><a href="#" id="logout-btn">로그아웃</a></li>
        <li><a href="/cart.html">장바구니</a></li>
        <li><a href="/cart.html">마이페이지</li>
      `;

      // 로그아웃 클릭 이벤트
      document.getElementById('logout-btn').addEventListener('click', async () => {
        await fetch('/api/auth/logout');
        alert('로그아웃 되었습니다.');
        window.location.href = '/Login.html'; // 또는 새로고침
      });

    } else {
      // 로그인 안된 상태: 로그인 버튼 유지
      listbar.innerHTML = `
        <li><a href="/Login.html">로그인</a></li>
        <li><a href="/cart.html">장바구니</a></li>
        <li>마이페이지</li>
      `;
    }

  } catch (err) {
    console.error('[네비게이션 오류]', err);
  }
});
