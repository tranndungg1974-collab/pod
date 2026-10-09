import { auth, db, ref, push, update, remove, onValue, set, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "./firebase.js";

// Tự động đăng nhập. Đặt false khi đưa website lên mạng thật.
const AUTO_LOGIN = true;
const ADMIN = { email: "dropship@hd.com", password: "123456" };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';

let products = {}, supplier = {}, editingId = null, started = false, autoTried = false;
let uid = null;
let settings = { redirectUrl: 'success.html' };

function toast(m) {
  const t = $('toast');
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

function errText(e) {
  return e.code === 'auth/invalid-credential'
    ? 'Sai email hoặc mật khẩu.'
    : e.code === 'PERMISSION_DENIED' || /permission/i.test(e.message)
      ? 'Tài khoản này không có quyền quản trị.'
      : 'Lỗi: ' + (e.code || e.message);
}

function userPath(sub) {
  return `users/${uid}/${sub}`;
}

onAuthStateChanged(auth, async user => {
  $('loginBox').hidden = !!user;
  $('adminBox').hidden = !user;

  if (user) {
    uid = user.uid;
    $('who').textContent = 'Đang đăng nhập: ' + user.email;
    start();
    return;
  }

  if (AUTO_LOGIN && !autoTried) {
    autoTried = true;
    try {
      await signInWithEmailAndPassword(auth, ADMIN.email, ADMIN.password);
    } catch (e) {
      $('loginMsg').textContent = errText(e);
    }
  }
});

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('loginMsg').textContent = '';
  try {
    await signInWithEmailAndPassword(auth, $('email').value, $('password').value);
  } catch (err) {
    $('loginMsg').textContent = errText(err);
  }
});

$('logout').addEventListener('click', () => {
  autoTried = true;
  signOut(auth);
});

function start() {
  if (started || !uid) return;
  started = true;
  const fail = e => toast(errText(e));

  onValue(ref(db, userPath('products')), s => {
    products = s.val() || {};
    renderProducts();
  }, fail);

  onValue(ref(db, userPath('supplier')), s => {
    supplier = s.val() || {};
    renderProducts();
  }, fail);

  onValue(ref(db, userPath('orders')), s => {
    renderOrders(s.val() || {});
  }, fail);

  onValue(ref(db, userPath('settings')), s => {
    settings = s.val() || { redirectUrl: 'success.html' };
    if ($('fRedirect')) $('fRedirect').value = settings.redirectUrl || 'success.html';
  }, fail);
}

function renderProducts() {
  const rows = Object.entries(products);
  $('pCount').textContent = rows.length;
  $('pTable').tBodies[0].innerHTML = rows.map(([id, p]) => {
    const cost = supplier[id]?.cost ?? 0;
    return `<tr>
      <td>${esc(p.name)}<br><small>${esc(p.type)}</small></td>
      <td>${esc(p.market || '-')}</td>
      <td>${fmt(p.price)}</td>
      <td>${fmt(cost)}</td>
      <td class="profit">${fmt(p.price - cost)}</td>
      <td>
        <button type="button" data-edit="${id}">Sửa</button>
        <button type="button" class="del" data-del="${id}">Xóa</button>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="6">Chưa có sản phẩm. Hãy thêm sản phẩm đầu tiên ở biểu mẫu phía trên.</td></tr>';
}

function renderOrders(orders) {
  const rows = Object.entries(orders).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
  $('oCount').textContent = rows.length;
  $('oTable').tBodies[0].innerHTML = rows.map(([id, o]) => `<tr>
    <td>${new Date(o.createdAt).toLocaleString('vi-VN')}</td>
    <td>${esc(o.contact || '-')}</td>
    <td>${(o.items || []).map(i => esc(i.name) + ' (' + esc(i.color) + ', ' + esc(i.size) + ')').join('<br>')}</td>
    <td>${fmt(o.total)}</td>
    <td>
      <select data-order="${id}">
        ${['pending:Chờ xử lý', 'ordered:Đã đặt NCC', 'shipped:Đang giao', 'done:Hoàn tất']
          .map(s => {
            const [v, l] = s.split(':');
            return `<option value="${v}" ${o.status === v ? 'selected' : ''}>${l}</option>`;
          }).join('')}
      </select>
    </td>
  </tr>`).join('') || '<tr><td colspan="5">Chưa có đơn hàng.</td></tr>';
}

// Lưu URL chuyển hướng sau checkout
$('saveRedirect')?.addEventListener('click', async () => {
  if (!uid) return;
  const url = ($('fRedirect').value || 'success.html').trim();
  try {
    await set(ref(db, userPath('settings')), { redirectUrl: url });
    toast('Đã lưu trang chuyển hướng checkout');
  } catch (err) {
    toast(errText(err));
  }
});

$('pForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!uid) return toast('Chưa đăng nhập');

  const id = editingId || push(ref(db, userPath('products'))).key;
  const data = {
    name: $('fName').value.trim(),
    type: $('fType').value,
    price: Number($('fPrice').value),
    market: $('fMarket').value,
    desc: $('fDesc').value.trim(),
    sizes: $('fSizes').value.split(',').map(s => s.trim()).filter(Boolean)
  };
  if (!data.sizes.length) data.sizes = ['Một cỡ'];
  if (/^https:\/\//.test($('fImage').value)) data.image = $('fImage').value.trim();

  try {
    await update(ref(db), {
      [userPath('products') + '/' + id]: data,
      [userPath('supplier') + '/' + id]: {
        cost: Number($('fCost').value),
        url: $('fSupplier').value.trim()
      }
    });
    toast(editingId ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm');
    resetForm();
  } catch (err) {
    $('formMsg').textContent = errText(err);
  }
});

function resetForm() {
  editingId = null;
  $('pForm').reset();
  $('formTitle').textContent = 'Thêm sản phẩm';
  $('cancelEdit').hidden = true;
  $('formMsg').textContent = '';
}

$('cancelEdit').addEventListener('click', resetForm);

$('pTable').addEventListener('click', async e => {
  const ed = e.target.dataset.edit;
  const del = e.target.dataset.del;

  if (ed) {
    const p = products[ed];
    const s = supplier[ed] || {};
    editingId = ed;
    $('fName').value = p.name || '';
    $('fType').value = p.type || 'shirt';
    $('fPrice').value = p.price || '';
    $('fCost').value = s.cost ?? '';
    $('fMarket').value = p.market || 'Việt Nam';
    $('fSizes').value = (p.sizes || []).join(',');
    $('fImage').value = p.image || '';
    $('fSupplier').value = s.url || '';
    $('fDesc').value = p.desc || '';
    $('formTitle').textContent = 'Sửa sản phẩm';
    $('cancelEdit').hidden = false;
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (del && confirm('Xóa sản phẩm "' + (products[del]?.name || '') + '"?')) {
    try {
      await update(ref(db), {
        [userPath('products') + '/' + del]: null,
        [userPath('supplier') + '/' + del]: null
      });
      toast('Đã xóa sản phẩm');
    } catch (err) {
      toast(errText(err));
    }
  }
});

$('oTable').addEventListener('change', async e => {
  if (e.target.dataset.order && uid) {
    try {
      await update(ref(db, userPath('orders') + '/' + e.target.dataset.order), {
        status: e.target.value
      });
      toast('Đã cập nhật trạng thái');
    } catch (err) {
      toast(errText(err));
    }
  }
});
