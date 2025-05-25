window.addEventListener('DOMContentLoaded', async () => {
  try {
    // 로그인 상태 확인 요청
    const res = await fetch('/api/auth/user', {
      credentials: 'include'  // 세션 쿠키 포함
    });
    const data = await res.json();

    // 네비게이션 바 .listbar 요소 가져오기
    const listbar = document.querySelector('.listbar');
    if (!listbar) return;

    if (data.loggedIn) {
      // 로그인 상태일 때 네비게이션 구성
      listbar.innerHTML = `
        <li><a href="#" id="logout-btn">로그아웃</a></li>
        <li><a href="/cart.html">장바구니</a></li>
        <li><a href="/myInfo.html">마이페이지</a></li>
      `;

      // 로그아웃 버튼 이벤트 등록
      document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await fetch('/api/auth/logout');
        alert('로그아웃 되었습니다.');
        window.location.href = '/Login.html';
      });

    } else {
      // ❌ 비로그인 상태일 때 네비게이션 구성
      listbar.innerHTML = `
        <li><a href="/Login.html">로그인</a></li>
        <li><a href="/cart.html">장바구니</a></li>
        <li><a href="/Login.html">마이페이지</a></li>
      `;
    }

  } catch (err) {
    console.error('[네비게이션 오류]', err);
  }
});
