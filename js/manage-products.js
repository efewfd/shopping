// 1차 카테고리에 따라 2차 카테고리를 자동 변경하는 매핑
const categoryMap = {
  top: ['basic', 'blouse', 'casual', 'shirt', 'hoddie', 'sweatshirt'],
  bottom: ['denim', 'short', 'cotton', 'leggings'],
  outerwear: ['coat', 'jacket', 'cardigan', 'vest'],
  dress: ['dress-min', 'dress-long'],
  skirt: ['skirt-min', 'skirt-long']
};

// select 요소 가져오기
const category1Select = document.querySelector('select[name="category1"]');
const category2Select = document.querySelector('select[name="category2"]');

// 1차 카테고리 변경 시, 관련된 2차 카테고리 옵션으로 갱신
category1Select.addEventListener('change', () => {
  const selectedCategory1 = category1Select.value;
  const subCategories = categoryMap[selectedCategory1] || [];

  // 2차 카테고리 초기화
  category2Select.innerHTML = '<option value="">2차 카테고리</option>';

  // 새로운 옵션 추가
  subCategories.forEach(sub => {
    const option = document.createElement('option');
    option.value = sub;
    option.textContent = sub;
    category2Select.appendChild(option);
  });
});

// 상품 등록
document.querySelector("#product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;

  // ✅ id가 비어 있으면 UUID 자동 생성
  if (!form.id.value) {
    form.id.value = crypto.randomUUID(); // 브라우저 내장 UUID 생성기
  }
console.log("✅ 최종 등록할 상품 ID:", form.id.value);


  const formData = new FormData(form);

  console.log("선택한 1차 카테고리:", form.category1.value);
  console.log("선택한 2차 카테고리:", form.category2.value);
  console.log("✅ 최종 등록될 상품 ID:", form.id.value); // 디버깅용

  const res = await fetch("/api/products", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  alert(data.message);
  form.reset();
  loadProducts();
});


// 상품 목록 불러오기
async function loadProducts() {
  const res = await fetch("/api/products");
  const products = await res.json();
  const tbody = document.querySelector("#product-table tbody");
  tbody.innerHTML = "";

products.forEach(product => {
  const pid = product.id || product._id;

  const row = document.createElement("tr");
  row.innerHTML = `
    <td><img src="${product.image_url}" width="60" /></td>
    <td><input type="text" value="${product.name}" id="name-${pid}" /></td>
    <td><input type="number" value="${product.price}" id="price-${pid}" /></td>
    <td><input type="number" value="${product.stock}" id="stock-${pid}" /></td>
    <td>${product.category1}</td>
    <td>${product.category2}</td>
    <td>
      <button onclick="updateProduct('${pid}')">수정</button>
      <button onclick="deleteProduct('${pid}')">삭제</button>
    </td>
  `;
  tbody.appendChild(row);
});

}

// 상품 삭제
function deleteProduct(id) {
  if (confirm('정말 삭제할까요?')) {
    fetch(`/api/products/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        loadProducts();
      });
  }
}

// 상품 수정
function updateProduct(id) {
  const name = document.getElementById(`name-${id}`).value;
  const price = document.getElementById(`price-${id}`).value;
  const stock = document.getElementById(`stock-${id}`).value;

  fetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price, stock })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadProducts();
    });
}

// 페이지 로드 시 상품 목록 불러오기
window.addEventListener("DOMContentLoaded", loadProducts);
