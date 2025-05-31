window.addEventListener('DOMContentLoaded', () => {
  const currentCategory = document.body.dataset.category2;
  const links = document.querySelectorAll('.sub-bar a');

  links.forEach(link => {
    const category = link.getAttribute('data-category');
    if (category === currentCategory) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
});

// 기존 로직
// // 페이지 로드 시 localAtorage에서 선택된 카테고리 불러와서 강조(선택된 카테고리를 기반으로)
// window.addEventListener('DOMContentLoaded', () => {
//     const category1 = document.body.dataset.category1;
//     const savedCategory = localStorage.getItem('selectedCategory');
//     const links = document.querySelectorAll('.sub-bar a');

//     links.forEach(link => {
//         const category = link.getAttribute('data-category');
//         if(category === savedCategory) {
//             // 클릭된 항목에 active 추가
//             link.classList.add('active');
//         } else {
//             link.classList.remove('active'); // 강조 초기화
//         }
//     });
// });

// // 카테고리 클릭 시 선택한 항목 기억
// // document.querySelectorAll('.sub-bar a').forEach(link => {
// //     link.addEventListener('click', (e) => {
// //         const category = link.getAttribute('data-category');
// //         localStorage.setItem('selectedCategory', category);
// //     });
// // });