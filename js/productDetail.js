// 별점 페이지 상태 변수
let selectedRating = 0;
let currentPage = 1;
const pageSize = 10;
let totalReviews = 0;
let wishBtn;

window.addEventListener('DOMContentLoaded', async () => {
  const Params = new URLSearchParams(window.location.search);
  const productId = Params.get('id');

  // ✅ 세션 로그인 상태 확인
  let userId = null;
  try {
    const authRes = await fetch('/api/auth/user', { credentials: 'include' });
    const authData = await authRes.json();

    if (!authData.loggedIn) {
      userId = null;
    } else {
      userId = authData.user.userId;
    }
  } catch (err) {
    console.error('세션 확인 실패:', err);
    userId = null;
  }

  if (!productId) return;

  try {
    const res = await fetch(`/api/products/${productId}`);
    if (!res.ok) throw new Error("서버 응답 실패");
    const product = await res.json();

    document.querySelector('.detail-image img').src = product.image_url;
    document.querySelector('.product-code').textContent = `상품번호: ${productId}`;
    document.querySelector('.product-title').textContent = product.name;
    document.querySelector('.original-price').textContent = `${parseInt(product.price).toLocaleString()}원`;

    if (!product || !product.image_url) throw new Error("상품이 존재하지 않거나 이미지 정보 없음");

    window.productForCart = {
      id: productId,
      code: productId,
      title: product.name,
      price: product.price,
      image: product.image_url,
      stock: product.stock
    };

    wishBtn = document.querySelector('.wishlist');
    if (!window.productForCart || !wishBtn) return;

    if (!userId) {
      wishBtn.disabled = true;
      wishBtn.title = "로그인 후 찜할 수 있습니다.";
    } else {
      wishBtn.addEventListener("click", () => {
        toggleWishlist(window.productForCart, wishBtn);
      });

      try {
        const res = await fetch(`/api/wishlist/${userId}`);
        const wishlist = await res.json();
        const isWished = wishlist.some(item => item.product_id === productId || item.id === productId);
        if (isWished) {
          wishBtn.textContent = "찜 취소";
          wishBtn.classList.add("active");
        }
      } catch (err) {
        console.warn('초기 찜 상태 확인 실패:', err);
      }
    }

    if (userId) {
      try {
        const res = await fetch(`/api/orders/${userId}`, { credentials: "include" });
        const orders = await res.json();
        const matchedOrder = orders.find(order => order.productId === productId && order.status === "배송완료");

        const reviewWriteBtn = document.getElementById("toggle-review-write-btn");
        if (reviewWriteBtn) {
          reviewWriteBtn.style.display = matchedOrder ? "block" : "none";
        }
      } catch (err) {
        console.warn("리뷰쓰기 조건 확인 실패:", err);
      }
    }

    // ✅ 리뷰 등록 버튼 이벤트 연결 (세션 userId 활용)
    const submitBtn = document.getElementById('submit-review-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const content = document.getElementById('review-content').value.trim();

        if (!userId) {
          alert('로그인이 필요합니다.');
          window.location.href = '/Login.html';
          return;
        }

        if (!content || selectedRating === 0) {
          alert('내용과 별점을 모두 입력해주세요');
          return;
        }

        await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, userId, content, rating: selectedRating })
        });

        alert('리뷰가 등록되었습니다.');
        document.getElementById('review-content').value = '';
        selectedRating = 0;
        highlightStars(0);
        document.getElementById('review-form').style.display = 'none';
        await loadReviews(true);
      });
    }

  } catch (err) {
    console.error('❌ 상품 정보 불러오기 실패:', err.message);
    alert('상품 정보를 불러올 수 없습니다.');
  }

  initReviewEvents();
});


// 상품 장바구니에 담기
async function addToCart(product) {
  // ✅ 로그인 여부 확인
  const res = await fetch('/api/auth/user', { credentials: 'include' });
  const data = await res.json();
  if (!data.loggedIn) {
    alert('로그인이 필요합니다.');
    window.location.href = '/Login.html';
    return;
  }

  const cart = JSON.parse(localStorage.getItem('cart')) || [];

  if (cart.some(item => item.id === product.id)) {
    alert('이미 장바구니에 담긴 상품입니다!');
    return;
  }

  const newItem = {
    id: product.id,
    code: product.code,
    title: product.title || product.name,
    price: product.price,
    image: product.image,
    stock: product.stock,
    quantity: 1
  };

  cart.push(newItem);
  localStorage.setItem('cart', JSON.stringify(cart));
  alert('장바구니에 담겼습니다!');
}



// 장바구니 담기 후 이동
async function addToCartAndGo() {
  // ✅ 로그인 여부 확인
  const res = await fetch('/api/auth/user', { credentials: 'include' });
  const data = await res.json();
  if (!data.loggedIn) {
    alert('로그인이 필요합니다.');
    window.location.href = '/Login.html';
    return;
  }

  const product = window.productForCart;
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.some(item => item.id === product.id)) {
    alert('이미 장바구니에 담긴 상품입니다.');
    window.location.href = 'cart.html';
    return;
  }

  const newItem = {
    id: product.id,
    code: product.code,
    title: product.title || product.name,
    price: product.price,
    image: product.image,
    stock: product.stock,
    quantity: 1
  };

  cart.push(newItem);
  localStorage.setItem("cart", JSON.stringify(cart));
  window.location.href = "cart.html";
}




// 찜 불러오기
function addToWishlist(product) {
  if (!product) {
    alert("상품 정보를 불러오는 중입니다.");
    return;
  }

  // 기존 찜 리스트 불러오기
  const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

  // 중복 방지 (상품 코드 기준)
  const exists = wishlist.find(item => item.code === product.code);
  if (exists) {
    alert("이미 찜한 상품입니다.");
    return;
  }

  // 추가 후 저장
  wishlist.push(product);
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  alert("찜한 상품에 추가되었습니다!");
}

//찜
async function toggleWishlist(product, buttonElement) {
  console.log("🟡 toggleWishlist 진입됨");

  const res = await fetch('/api/auth/user', { credentials: 'include' });
  const data = await res.json();

  if (!data.loggedIn) {
    alert('로그인이 필요합니다.');
    window.location.href = '/Login.html';
    return;
  }

  const userId = data.user.userId;
  const productId = product.id || product.code;
  const isWished = buttonElement.classList.contains("active");

  try {
    if (isWished) {
      const deleteRes = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId })
      });

      if (!deleteRes.ok) throw new Error('찜 삭제 실패');

      console.log("❌ 찜 취소 완료");
      alert("찜을 취소했습니다.");
      buttonElement.textContent = "찜하기";
      buttonElement.classList.remove("active");

    } else {
      const postRes = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId })
      });

      if (!postRes.ok) {
        const result = await postRes.json();
        if (postRes.status === 409) {
          alert("이미 찜한 상품입니다.");
        } else {
          throw new Error(result.message || "찜 등록 실패");
        }
        return;
      }

      console.log("✅ 찜 등록 성공");
      alert("찜한 상품에 추가되었습니다.");
      buttonElement.textContent = "찜 취소";
      buttonElement.classList.add("active");
    }

  } catch (err) {
    console.error("❗ 찜 처리 실패:", err);
    alert("찜 처리 중 오류가 발생했습니다.");
  }
}




// 구매후기 버튼 -> 전체 영역 보이기 + 리뷰 리스트 불러오기
document.getElementById('toggle-review-list-btn').addEventListener('click', async () => {
  const area = document.getElementById('review-area');
  const isVisible = area.style.display === 'block';

  if (!isVisible) {
    area.style.display = 'block';
    await loadReviews();
  } else {
    area.style.display = 'none';
  }
});

// 리뷰쓰기 버튼 -> 입력창 토글
document.getElementById('toggle-review-write-btn').addEventListener('click', async () => {
  // 로그인 여부 확인
  const res = await fetch('/api/auth/user');
  const data = await res.json();

  if (!data.loggedIn) {
    alert('로그인 후 리뷰를 작성할 수 있습니다.');
    window.location.href = '/Login.html';
    return;
  }
  // 로그인 되어 있으면 입력창 토글
  const form = document.getElementById('review-form');
  form.style.display = form.style.display === 'block' ? 'none' : 'block';
});

// 리뷰 목록 불러오기
async function loadReviews(reset = false) {
  const Params = new URLSearchParams(window.location.search);
  const productId = Params.get('id');
  const sort = document.getElementById('review-sort').value;

  // reset=true면 리스트 초기화(리뷰쓰기/필터 변경 시 사용)
  if(reset) {
    currentPage = 1;
    document.getElementById('review-list').innerHTML = '';
  }

  // 서버로 요청: 페이지, 정렬 기준 포함
  const res = await fetch(`/api/reviews/${productId}?sort=${sort}&page=${currentPage}&limit=${pageSize}`);
  const data = await res.json();
  const { reviews, total } = data;

  totalReviews = total; // 총 개수 저장

  const list = document.getElementById('review-list');

  // 첫 페이지부터 데이터 없으면 메시지 출력
  if (reviews.length === 0 && currentPage === 1) {
    list.innerHTML = '<p>등록된 후기가 없습니다.</p>';
    document.getElementById('load-more-btn').style.display = 'none';
    return;
  }

  // HTML로 이어붙이기 (누적)
  list.innerHTML += reviews.map(r => `
    <div class="review-item" style="margin-bottom: 10px;">
      <div><strong>${r.userId || '익명'}</strong> ${'⭐'.repeat(r.rating || 0)}</div>
      <div>${r.content}</div>
    </div>
  `).join('');

  // 더보기 버튼
  const totalPages = Math.ceil(totalReviews / pageSize);
  if(currentPage < totalPages) {
    document.getElementById('load-more-btn').style.display = 'block'; // 더보기 표시
  } else {
    document.getElementById('load-more-btn').style.display = 'none';  // 더 이상 없음
  }

  currentPage++;  // 다음 페이지 준비

}

// 리뷰 등록
async function submitReview() {
  const content = document.getElementById('review-content').value.trim();
  const Params = new URLSearchParams(window.location.search);
  const productId = Params.get('id');
  const userId = localStorage.getItem('userId');

  if (!content || selectedRating === 0) {
    alert('내용과 별점을 모두 입력해주세요');
    return;
  }

  await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, userId, content, rating: selectedRating })
  });

  alert('리뷰가 등록되었습니다.');
  document.getElementById('review-content').value = '';
  selectedRating = 0;
  highlightStars(0);
  document.getElementById('review-form').style.display = 'none';
  await loadReviews(true);
}

// window.addEventListener('DOMContentLoaded', () => {
//   initReviewEvents(); // 초기화 함수 실행
// });

function highlightStars(count) {
  document.querySelectorAll('#rating-stars span').forEach(star => {
    const val = parseInt(star.dataset.value);
    star.textContent = val <= count ? '⭐' : '☆';
  });
}

function initReviewEvents() {

  document.querySelectorAll('#rating-stars span').forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.value);
      highlightStars(selectedRating);
    });
  });

  document.getElementById('review-sort').addEventListener('change', () => {
    loadReviews(); // 정렬 기준 변경 시 리뷰 새로 불러오기
  });
}

// 더보기 버튼 클릭 시 -> 다음 페이지 리뷰 추가로 로드
document.getElementById('load-more-btn').addEventListener('click', () => {
  loadReviews(); // reset 없이 누적
});


window.addToCart = addToCart;
window.addToCartAndGo = addToCartAndGo;
