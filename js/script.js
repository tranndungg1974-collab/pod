import { db, ref, set, push } from "./firebase.js";

// ===== Màu sắc =====
const COLORS = {
  white: '#ffffff',
  black: '#1f2937',
  blue:  '#2563eb',
  red:   '#ef4444',
  green: '#16a34a'
};

// Dữ liệu sản phẩm local (rules chỉ cho phép /users/$uid nên index dùng data mẫu)
const PRODUCTS = [
  { id: 1, name: 'Áo thun', type: 'shirt', price: 199000, rating: 5, sizes: ['S','M','L','XL'], desc: 'Sản phẩm POD phổ biến nhất. Vải cotton mềm, in sắc nét.' },
  { id: 2, name: 'Hoodie', type: 'hoodie', price: 399000, rating: 4, sizes: ['M','L','XL'], desc: 'Nhu cầu cao vào mùa lạnh. Nỉ dày, in bền màu.' },
  { id: 3, name: 'Cốc sứ', type: 'mug', price: 129000, rating: 4, sizes: ['330ml','450ml'], desc: 'Món quà tặng phổ biến, in được cả hai mặt.' },
  { id: 4, name: 'Poster', type: 'poster', price: 89000, rating: 3, sizes: ['A4','A3','A2'], desc: 'Trang trí phòng, in trên giấy mỹ thuật.' },
  { id: 5, name: 'Ốp điện thoại', type: 'case', price: 149000, rating: 4, sizes: ['iPhone 15','iPhone 16','Galaxy S24'], desc: 'Nhiều mẫu thiết kế, nhiều dòng máy.' },
  { id: 6, name: 'Túi tote', type: 'tote', price: 119000, rating: 4, sizes: ['Một cỡ'], desc: 'Túi vải canvas thân thiện môi trường.' }
];

const CATEGORIES = [
  { key: 'all', label: 'Tất cả' },
  { key: 'shirt', label: 'Áo thun' },
  { key: 'hoodie', label: 'Hoodie' },
  { key: 'mug', label: 'Cốc' },
  { key: 'poster', label: 'Poster' },
  { key: 'case', label: 'Ốp điện thoại' },
  { key: 'tote', label: 'Túi tote' }
];

// ===== Helpers =====
const $ = id => document.getElementById(id);
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);

function visual(p, c) {
  if (/^https:\/\//.test(p.image || '')) {
    return `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
  }
  return art(p.type, c);
}

function art(type, c) {
  const s = 'stroke="#0f172a" stroke-opacity=".25" stroke-width="2"';
  const logo = `<circle cx="100" cy="95" r="14" fill="${c === '#ffffff' ? '#2563eb' : '#fff'}" opacity=".9"/>`;
  const shapes = {
    shirt:  `<path d="M60 30 L85 20 Q100 36 115 20 L140 30 L170 60 L148 80 L140 70 V170 H60 V70 L52 80 L30 60 Z" fill="${c}" ${s}/>${logo}`,
    hoodie: `<path d="M62 34 Q100 6 138 34 L172 70 L150 92 L140 80 V172 H60 V80 L50 92 L28 70 Z" fill="${c}" ${s}/><path d="M80 34 Q100 60 120 34" fill="none" ${s}/><rect x="82" y="120" width="36" height="26" rx="6" fill="none" ${s}/>`,
    mug:    `<rect x="46" y="50" width="86" height="100" rx="8" fill="${c}" ${s}/><path d="M132 70 h14 q16 0 16 24 t-16 24 h-14" fill="none" stroke="#0f172a" stroke-opacity=".35" stroke-width="8"/>${logo.replace('cx="100"','cx="89"').replace('cy="95"','cy="100"')}`,
    poster: `<rect x="50" y="20" width="100" height="150" fill="${c}" ${s}/><rect x="62" y="34" width="76" height="76" fill="#2563eb" opacity=".8"/><rect x="62" y="124" width="76" height="8" fill="#94a3b8"/><rect x="62" y="142" width="50" height="8" fill="#cbd5e1"/>`,
    case:   `<rect x="62" y="16" width="76" height="160" rx="16" fill="${c}" ${s}/><rect x="72" y="26" width="26" height="26" rx="8" fill="#0f172a" opacity=".6"/><circle cx="85" cy="39" r="6" fill="#64748b"/>${logo.replace('cy="95"','cy="120"')}`,
    tote:   `<path d="M80 70 V50 a20 20 0 0 1 40 0 V70" fill="none" stroke="#0f172a" stroke-opacity=".4" stroke-width="6"/><path d="M52 70 H148 L156 172 H44 Z" fill="${c}" ${s}/>${logo.replace('cy="95"','cy="120"')}`
  };
  return `<svg viewBox="0 0 200 190" role="img" aria-hidden="true">${shapes[type] || shapes.shirt}</svg>`;
}

// ===== State =====
let state = { cat: 'all', q: '', sort: 'pop' };
let current = null;
let color = 'white';
let cart = JSON.parse(localStorage.getItem('pod-cart') || '[]');

// ===== Render =====
function renderFilters() {
  $('filters').innerHTML = CATEGORIES.map(c =>
    `<button type="button" data-cat="${c.key}" class="${state.cat === c.key ? 'active' : ''}">${c.label}</button>`
  ).join('');
}

function renderProducts() {
  let list = PRODUCTS.filter(p =>
    (state.cat === 'all' || p.type === state.cat) &&
    p.name.toLowerCase().includes(state.q.toLowerCase())
  );

  if (state.sort === 'asc') list.sort((a, b) => a.price - b.price);
  else if (state.sort === 'desc') list.sort((a, b) => b.price - a.price);
  else list.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  $('productGrid').innerHTML = list.map(p => `
    <button type="button" class="product" data-id="${p.id}">
      <div class="thumb">${visual(p, COLORS.white)}</div>
      <div class="p-info">
        <h3>${esc(p.name)}</h3>
        <div class="stars">${stars(p.rating || 4)}</div>
        <div class="price">${fmt(p.price)}</div>
      </div>
    </button>
  `).join('');

  $('empty').hidden = list.length > 0;
  if ($('loading')) $('loading').hidden = true;
}

// ===== Modal =====
function openModal(id) {
  current = PRODUCTS.find(p => String(p.id) === String(id));
  if (!current) return;
  color = 'white';

  $('mTitle').textContent = current.name;
  $('mStars').textContent = stars(current.rating || 4);
  $('mDesc').textContent = current.desc || '';
  $('mPrice').textContent = fmt(current.price);
  $('mSize').innerHTML = (current.sizes || ['Một cỡ']).map(s => `<option>${esc(s)}</option>`).join('');
  $('mColors').innerHTML = Object.entries(COLORS).map(([k, v]) =>
    `<button type="button" class="swatch ${k === color ? 'active' : ''}" data-color="${k}" style="background:${v}" aria-label="Màu ${k}"></button>`
  ).join('');
  $('mImg').innerHTML = visual(current, COLORS[color]);

  $('modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('modal').hidden = true;
  document.body.style.overflow = '';
}

// ===== Cart =====
function saveCart() {
  try { localStorage.setItem('pod-cart', JSON.stringify(cart)); } catch (e) {}
  renderCart();
}

function renderCart() {
  $('cartCount').textContent = cart.length;
  $('cartList').innerHTML = cart.length
    ? cart.map((it, i) => `
        <li>
          <span>${esc(it.name)}<br><small>${esc(it.color)} · ${esc(it.size)} — ${fmt(it.price)}</small></span>
          <button type="button" data-del="${i}" aria-label="Xóa ${esc(it.name)}">Xóa</button>
        </li>`).join('')
    : '<li class="empty-cart">Giỏ hàng trống. Chọn một sản phẩm để thêm vào.</li>';
  $('cartTotal').textContent = fmt(cart.reduce((s, i) => s + i.price, 0));
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

// ===== Events =====
$('filters').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  state.cat = b.dataset.cat;
  renderFilters();
  renderProducts();
});

$('search').addEventListener('input', e => {
  state.q = e.target.value;
  renderProducts();
});

$('sort').addEventListener('change', e => {
  state.sort = e.target.value;
  renderProducts();
});

$('productGrid').addEventListener('click', e => {
  const b = e.target.closest('.product');
  if (b) openModal(b.dataset.id);
});

$('mColors').addEventListener('click', e => {
  const b = e.target.closest('.swatch');
  if (!b) return;
  color = b.dataset.color;
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s === b));
  $('mImg').innerHTML = visual(current, COLORS[color]);
});

$('addCart').addEventListener('click', () => {
  if (!current) return;
  cart.push({
    name: current.name,
    price: current.price,
    color,
    size: $('mSize').value
  });
  saveCart();
  closeModal();
  toast('Đã thêm ' + current.name + ' vào giỏ');
});

$('closeModal').addEventListener('click', closeModal);
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

$('cartBtn').addEventListener('click', () => { $('drawer').hidden = false; });
$('closeCart').addEventListener('click', () => { $('drawer').hidden = true; });

$('cartList').addEventListener('click', e => {
  const b = e.target.closest('[data-del]');
  if (b) {
    cart.splice(+b.dataset.del, 1);
    saveCart();
  }
});

// Checkout demo – không ghi Firebase (rules chỉ cho /users/$uid, index không đăng nhập)
$('checkout').addEventListener('click', () => {
  if (!cart.length) return toast('Giỏ hàng đang trống');
  const contact = prompt('Nhập tên và số điện thoại nhận hàng:');
  if (!contact) return;
  cart = [];
  saveCart();
  $('drawer').hidden = true;
  toast('Đặt hàng thành công! (demo)');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    $('drawer').hidden = true;
  }
});

// ===== Khởi tạo =====
renderFilters();
renderProducts();
renderCart();
