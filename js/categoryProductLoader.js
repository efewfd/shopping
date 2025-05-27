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
      try {
        const check = await fetch(`/api/products/${item._id}`);
        if (check.ok) {
          const validProduct = await check.json();
          if (validProduct) validatedProducts.push(validProduct);
        }
      } catch (err) {
        console.warn("❌ 삭제된 상품 걸러냄:", item._id);
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
