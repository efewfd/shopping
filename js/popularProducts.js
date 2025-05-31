async function loadPopularProducts() {
  try {
    const res = await fetch('/api/products/popular');
    const data = await res.json();
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
        <span class="rank">TOP ${index + 1}</span>
        <a href="/productDetail.html?id=${item.id}">
          <img src="${item.image_url}" alt="${item.name}" />
          <p>${item.name}</p>
          <p>${parseInt(item.price).toLocaleString()}원</p>
          <p style="font-size: 13px;">⭐ ${item.avg_rating?.toFixed(1) || 0}점 | 후기 ${item.review_count} | 찜 ${item.wish_count}</p>
        </a>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error('🔥 인기 상품 불러오기 실패:', err);
  }
}

window.addEventListener('DOMContentLoaded', loadPopularProducts);
