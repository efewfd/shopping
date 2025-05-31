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
  const pid = typeof item.id === 'string'
    ? item.id
    : (typeof item._id === 'string' ? item._id : null);

  if (!pid) {
    console.warn("❌ 유효하지 않은 상품 ID:", item);
    continue;
  }

  try {
    const res = await fetch(`/api/products/${pid}`);
    if (!res.ok) {
      console.warn(`❌ 삭제된 상품 ID: ${pid}`);
      continue;
    }

    const product = await res.json();
    if (product && product.name) {
      validatedProducts.push(product);
    }
  } catch (err) {
    console.warn("❌ 상품 확인 실패:", pid);
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

      const pid = product.id || product._id; // ✅ 안전하게 ID 추출

      card.innerHTML = `
        <a href="/productDetail.html?id=${pid}">
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
