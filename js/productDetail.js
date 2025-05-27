window.addEventListener('DOMContentLoaded', async () => {
  const Params = new URLSearchParams(window.location.search);
  const productId = Params.get('id');


  if (!productId) return;

  try {
    const res = await fetch(`/api/products/${productId}`);
    const product = await res.json();

    // 화면에 반영
    document.querySelector('.detail-image img').src = product.image_url;
    document.querySelector('.product-code').textContent = `상품번호: ${product._id}`;
    document.querySelector('.product-title').textContent = product.name;
    document.querySelector('.original-price').textContent = `${parseInt(product.price).toLocaleString()}원`;

    // 장바구니/찜용 저장
    window.productForCart = {
      id: product._id,
      code: product._id, // 찜 토글에서 이 값 사용
      title: product.name || product.title,
      price: product.price,
      image: product.image_url,
      stock: product.stock
    };

    // 이 시점 이후에 버튼 이벤트 연결
  const wishBtn = document.querySelector('.wishlist');
  if (!window.productForCart) {
  alert('상품 정보를 불러오는 중입니다.');
  return;
}

  if (wishBtn) {
    wishBtn.addEventListener("click", () => {
      console.log("✅ 찜 버튼 눌림");
      toggleWishlist(window.productForCart, wishBtn);
    });

    // 초기 찜 상태 반영
    const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
    if (wishlist.some(item => item.code === product._id)) {
      wishBtn.textContent = "찜 취소";
      wishBtn.classList.add("active");
    }
  }

  } catch (err) {
    console.error('상품 정보 불러오기 실패:', err);
  }
});


// 상품 장바구니에 담기
function addToCart(product) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];

  if (cart.some(item => item.id === product.id)) {
    alert('이미 장바구니에 담긴 상품입니다!');
    return;
  }

  const newItem = {
    id: product.id,
    code: product.code,
    title: product.title || product.name,     // ✅ 안전하게 넣기
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
function addToCartAndGo() {
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
    title: product.title || product.name,    // ✅ 여기도 추가
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

  const userId = localStorage.getItem('userId');
  if (!userId) {
    alert('로그인이 필요합니다.');
    return;
  }

  const isWished = buttonElement.classList.contains("active");

  try {
    if (isWished) {
      // ❌ 이미 찜된 상태 → 삭제 요청
      const deleteRes = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId: product.code })
      });

      if (!deleteRes.ok) throw new Error('찜 삭제 실패');

      buttonElement.textContent = "찜하기";
      buttonElement.classList.remove("active");
    } else {
      // ✅ 아직 안 찜된 상태 → 등록 요청
      const postRes = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          productId: product.code,
          product: {
            title: product.title,
            price: product.price,
            image: product.image,
            stock: product.stock
          }
        })
      });

      if (!postRes.ok) throw new Error('찜 등록 실패');

      const result = await postRes.json(); // ✅ 이 줄 추가
      console.log("✅ 찜 등록 응답:", result);
      buttonElement.textContent = "찜 취소";
      buttonElement.classList.add("active");
    }
  } catch (error) {
    console.error('찜 처리 실패:', error);
    alert('오류가 발생했습니다.');
  }
}


window.addToCart = addToCart;
window.addToCartAndGo = addToCartAndGo;
