async function loadPopularProducts() {
  try {
    const res = await fetch('/api/products/popular');
    const data = await res.json();

    console.log("✅ 인기 상품 데이터:", data);

    if (!Array.isArray(data)) {
      console.warn("🚨 서버 응답이 배열이 아닙니다:", data);
      return;
    }

    const container = document.getElementById('popular-list');
    container.innerHTML = '';

    data.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'popular-item';
      div.innerHTML = `
        <span class="rank">🔥 TOP ${index + 1}</span>
        <a href="/productDetail.html?id=${item.id}">
          <img src="${item.image_url}" alt="${item.name}" />
          <div class="info">
            <p class="name">${item.name}</p>
            <p class="price">${parseInt(item.price).toLocaleString()}원</p>
            <p class="meta">
              ⭐ ${item.avg_rating?.toFixed(1) || 0}점 &nbsp;｜&nbsp; 
              후기 ${item.review_count} &nbsp;｜&nbsp; 
              찜 ${item.wish_count}
            </p>
          </div>
        </a>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    console.error('🔥 인기 상품 불러오기 실패:', err);
  }
}

window.addEventListener('DOMContentLoaded', loadPopularProducts);
