// 장바구니 불러오기
const cart = JSON.parse(localStorage.getItem('cart')) || [];
const hasItems = cart.length > 0;

document.querySelector('.cart-table.empty').style.display = hasItems ? 'none' : '';
document.querySelector('.cart-table.full').style.display = hasItems ? '' : 'none';
document.querySelector('.cart-summary').style.display = hasItems ? '' : 'none';
document.querySelector('.cart-buttons').style.display = hasItems ? '' : 'none';

if (hasItems) {
  const tbody = document.querySelector('.cart-table.full tbody');
  tbody.innerHTML = ''; // 초기화

  let totalPrice = 0;

  cart.forEach(item => {
    const quantity = item.quantity || 1;
    const price = parseInt(item.price);
    const itemTotal = price * quantity;
    totalPrice += itemTotal;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="checkbox" class="item-checkbox" data-id="${item.id}" /></td>
      <td><img src="${item.image}" alt="${item.title}" class="item-img" /></td>
      <td>${item.title}</td>
      <td>${price.toLocaleString()}원</td>
      <td>
        <button onclick="changeQuantity('${item.id}', -1)">-</button>
        <span id="qty-${item.id}">${item.quantity || 1}</span>
        <button onclick="changeQuantity('${item.id}', 1)">+</button>
        <button onclick="updateQuantity('${item.id}')">수정</button>
      </td>
      <td>무료배송</td>
      <td>0원</td>
      <td>${itemTotal.toLocaleString()}원</td>
      <td>
        <button onclick="removeItem('${item.id}')">삭제하기</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  document.querySelector('.cart-summary').innerHTML = 
    `총 구매금액: ${totalPrice.toLocaleString()}원 + 배송료: 0원 = <strong>${totalPrice.toLocaleString()}원</strong>`;
}

function removeItem(id) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const updatedCart = cart.filter(item => item.id !== id);
  localStorage.setItem('cart', JSON.stringify(updatedCart));
  window.location.reload();
}

async function changeQuantity(id, diff) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const index = cart.findIndex(item => item.id === id);

  if (index !== -1) {
    const currentQty = cart[index].quantity || 1;
    const stock = cart[index].stock || 1;
    const newQty = currentQty + diff;

    if (newQty < 1) {
      alert('최소 수량은 1개입니다.');
      return;
    }

    if (newQty > stock) {
      alert(`최대 주문 가능 수량은 ${stock}개입니다.`);
      return;
    }

    cart[index].quantity = newQty;
    localStorage.setItem('cart', JSON.stringify(cart));

    await fetch('/api/cart/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: id, quantity: newQty })
    });

    window.location.reload();
  }
}

async function updateQuantity(id) {
  const span = document.getElementById(`qty-${id}`);
  const quantity = parseInt(span.textContent);

  if (isNaN(quantity) || quantity < 1) {
    alert('수량이 유효하지 않습니다.');
    return;
  }

  await fetch('/api/cart/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: id, quantity })
  });

  alert('수정 완료!');
  window.location.reload();
}

async function clearCart() {
  const confirmed = confirm('정말로 모든 상품을 삭제하시겠습니까?');
  if (confirmed) {
    await fetch('/api/cart/clear', { method: 'POST' });
    localStorage.removeItem('cart');
    window.location.reload();
  }
}
function renderCartItems() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const hasItems = cart.length > 0;

  document.querySelector(".cart-table.empty").style.display = hasItems ? "none" : "";
  document.querySelector(".cart-table.full").style.display = hasItems ? "" : "none";
  document.querySelector(".cart-summary").style.display = hasItems ? "" : "none";
  document.querySelector(".cart-buttons").style.display = hasItems ? "" : "none";

  const tbody = document.querySelector(".cart-table.full tbody");
  tbody.innerHTML = "";

  let totalPrice = 0;

  cart.forEach(item => {
    const quantity = item.quantity || 1;
    const price = parseInt(item.price);
    const itemTotal = price * quantity;
    totalPrice += itemTotal;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" class="item-checkbox" data-id="${item.id}" /></td>
      <td><img src="${item.image}" alt="${item.title}" class="item-img" /></td>
      <td>${item.title}</td>
      <td>${price.toLocaleString()}원</td>
      <td>
        <button onclick="changeQuantity('${item.id}', -1)">-</button>
        <span id="qty-${item.id}">${item.quantity || 1}</span>
        <button onclick="changeQuantity('${item.id}', 1)">+</button>
      </td>
      <td>무료배송</td>
      <td>0원</td>
      <td>${itemTotal.toLocaleString()}원</td>
      <td><button onclick="removeItem('${item.id}')">삭제하기</button></td>
    `;
    tbody.appendChild(row);
  });

  document.querySelector(".cart-summary").innerHTML =
    `총 구매금액: ${totalPrice.toLocaleString()}원 + 배송료: 0원 = <strong>${totalPrice.toLocaleString()}원</strong>`;
}


async function validateCart() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const validatedCart = [];

  for (const item of cart) {
    try {
      const res = await fetch(`/api/products/${item.id}`);
      if (res.ok) {
        const product = await res.json();
        if (product) validatedCart.push(item);
      }
    } catch (err) {
      console.warn("❌ 삭제된 상품:", item.id);
    }
  }

  localStorage.setItem("cart", JSON.stringify(validatedCart));
}


// ✅ 전체 선택 체크박스 기능 + validateCart() 호출
window.addEventListener("DOMContentLoaded", async () => {
  await validateCart();
  renderCartItems();
  attachOrderButton(); 

  const selectAll = document.getElementById("select-all");
  if (selectAll) {
    selectAll.addEventListener("change", () => {
      const allCheckboxes = document.querySelectorAll(".item-checkbox");
      allCheckboxes.forEach(cb => {
        cb.checked = selectAll.checked;
      });
    });
  }
});
function attachOrderButton() {
  const orderBtn = document.getElementById("order-button");
  if (orderBtn) {
    orderBtn.addEventListener("click", (e) => {
      e.preventDefault();
      submitAllOrders(); // ✅ 여기에 잘 연결돼 있어야 함
    });
  }
}



// ✅ 체크된 상품만 주문 기능 (전체 + 선택 공통)
async function submitAllOrders() {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    alert("로그인이 필요합니다.");
    return;
  }

  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const checkboxes = document.querySelectorAll(".item-checkbox:checked");
  if (checkboxes.length === 0) {
    alert("주문할 상품을 선택해주세요.");
    return;
  }

const selectedItems = [];

for (const checkbox of checkboxes) {
  const productId = checkbox.dataset.id;
  if (!productId) continue; // 혹시라도 undefined이면 무시

  const product = cart.find(item => item.id === productId);
  if (!product) {
    console.warn("❗ 상품 못 찾음:", productId);
    continue;
  }
  selectedItems.push(product);
}

// ✅ 선택된 상품이 하나도 없으면 중단 (경고 + 이동 X)
if (!selectedItems.length) {
  alert("주문할 상품을 선택해주세요.");
  return; // ❗ 반드시 return으로 종료시켜야 함!
}

// ✅ 정상 처리
localStorage.setItem("pendingOrders", JSON.stringify(selectedItems));
location.href = "checkout.html";

}