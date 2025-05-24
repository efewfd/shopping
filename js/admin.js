document.querySelector("#product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
  
    const res = await fetch("/api/products", {
      method: "POST",
      body: formData,
    });
  
    const data = await res.json();
    alert(data.message);
  });
  
  window.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("/api/orders");
  const orders = await res.json();

  const list = document.getElementById("order-list");
  list.innerHTML = orders.map(order => `
    <tr>
      <td>${order._id}</td>
      <td>${order.userId}</td>
      <td>${order.productId}</td>
      <td>${order.quantity}</td>
      <td>${order.status}</td>
      <td>
        <button onclick="updateStatus('${order._id}', '배송중')">배송중</button>
        <button onclick="updateStatus('${order._id}', '배송완료')">배송완료</button>
      </td>
    </tr>
  `).join('');
});

async function updateStatus(orderId, newStatus) {
  const res = await fetch(`/api/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus })
  });

  if (res.ok) {
    alert("상태가 변경되었습니다.");
    location.reload();
  } else {
    alert("업데이트 실패");
  }
}
