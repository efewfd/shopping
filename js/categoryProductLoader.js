window.addEventListener('DOMContentLoaded', loadCategoryProducts);

async function loadCategoryProducts() {
  const category1 = document.body.dataset.category1 || ''; 
  const category2 = document.body.dataset.category2 || '';

  const params = new URLSearchParams();
  if (category1) params.append('category1', category1);
  if (category2) params.append('category2', category2);
  const url = '/api/products?' + params.toString();

  console.log("요청 URL:", url);
  console.log("category1:", category1);
  console.log("category2:", category2);

  try {
    const res = await fetch(url);
    const products = await res.json();

const validatedProducts = [];

for (const item of products) {
  // ✅ 상품 ID 유효성 체크 (빈 문자열, undefined 등 제거)
  if (!item || !item._id || typeof item._id !== 'string') {
    console.warn("❌ 유효하지 않은 상품 ID:", item);
    continue;
  }

  // ✅ 상품이 백엔드에 존재하는지 확인
  try {
    const res = await fetch(`/api/products/${item._id}`);
    if (!res.ok) {
      console.warn(`❌ 삭제된 상품 ID: ${item._id}`);
      continue;
    }

    const product = await res.json();
    if (product && product.name) {
      validatedProducts.push(product);
    }
  } catch (err) {
    console.warn("❌ 상품 확인 실패:", item._id);
  }
}


    const container = document.getElementById('product-list');
    container.innerHTML = '';

    if (validatedProducts.length === 0) {
      container.innerHTML = '<p>해당 카테고리에 등록된 상품이 없습니다.</p>';
      return;
    }

    validatedProducts.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';

      card.innerHTML = `
        <a href="/productDetail.html?id=${product._id}">
          <img src="${product.image_url || '/images/default.png'}" alt="${product.name}" />
          <p class="product-name">${product.name}</p>
          <p class="product-price">${parseInt(product.price).toLocaleString()}원</p>
        </a>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error('상품 불러오기 실패:', err);
  }
}
