const state = {
  currentUser: null,
  cart: []
};

const api = {
  get: async (url) => {
    const res = await fetch(url);
    return res.json();
  },
  post: async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res.json();
  }
};

function formatMoney(value) {
  return `Rs. ${Number(value).toLocaleString()}`;
}

function setCurrentUser(user) {
  state.currentUser = user;
  localStorage.setItem('marketlink-user', JSON.stringify(user));
  renderHeaderUser();
}

function getCurrentUser() {
  const raw = localStorage.getItem('marketlink-user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem('marketlink-user');
  state.currentUser = null;
  renderHeaderUser();
  window.location.href = '/index.html';
}

function renderHeaderUser() {
  const el = document.getElementById('accountSlot');
  if (!el) return;

  const user = state.currentUser || getCurrentUser();
  if (user) {
    el.innerHTML = `
      <span class="muted">Hi, ${user.name}</span>
      <button class="btn btn-secondary" onclick="goToDashboard('${user.role}')">Dashboard</button>
      <button class="btn btn-primary" onclick="logout()">Logout</button>
    `;
  } else {
    el.innerHTML = `
      <button class="btn btn-secondary" data-modal-open="login">Login</button>
      <button class="btn btn-primary" data-modal-open="register">Register</button>
    `;
  }
}

function goToDashboard(role) {
  if (role === 'customer') window.location.href = '/customer.html';
  else if (role === 'farmer') window.location.href = '/farmer.html';
  else window.location.href = '/admin.html';
}

function bindModalButtons() {
  document.querySelectorAll('[data-modal-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById(btn.dataset.modalOpen + 'Modal');
      if (modal) modal.classList.add('show');
    });
  });

  document.querySelectorAll('.close-modal').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.modal').classList.remove('show'));
  });
}

async function loginUser(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    email: form.email.value,
    password: form.password.value
  };

  const res = await api.post('/api/login', payload);
  if (res.user) {
    setCurrentUser(res.user);
    form.reset();
    document.getElementById('loginModal').classList.remove('show');
    goToDashboard(res.user.role);
  } else {
    alert(res.message || 'Login failed.');
  }
}

async function registerUser(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    address: form.address.value,
    password: form.password.value,
    role: form.role.value
  };

  const res = await api.post('/api/register', payload);
  if (res.user) {
    setCurrentUser(res.user);
    form.reset();
    document.getElementById('registerModal').classList.remove('show');
    goToDashboard(res.user.role);
  } else {
    alert(res.message || 'Registration failed.');
  }
}

function renderHomePage() {
  const page = document.getElementById('homePage');
  if (!page) return;

  Promise.all([
    api.get('/api/public-data'),
    api.get('/api/markets'),
    api.get('/api/farmers'),
    api.get('/api/products')
  ]).then(([data, markets, farmers, products]) => {
    document.getElementById('featuredMarkets').innerHTML = markets.slice(0, 3).map((market) => `
      <article class="card market-card">
        <img src="https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80" alt="${market.name}">
        <div class="card-body">
          <h3>${market.name}</h3>
          <div class="meta-row"><span>${market.day}</span><span>${market.openingTime} - ${market.closingTime}</span></div>
          <div class="meta-row"><span>${market.address}</span><span>${market.farmers} Farmers</span></div>
          <a href="/markets.html" class="btn btn-secondary">View Market</a>
        </div>
      </article>
    `).join('');

    document.getElementById('featuredFarmers').innerHTML = farmers.slice(0, 4).map((farmer) => `
      <article class="card farmer-card">
        <img src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=900&q=80" alt="${farmer.name}">
        <div class="card-body">
          <h3>${farmer.name}</h3>
          <div class="rating">★★★★★ ${farmer.rating}</div>
          <div class="muted">${farmer.specialty}</div>
          <div class="meta-row"><span>${farmer.location}</span><span>${farmer.operatingDays.join(', ')}</span></div>
          <a href="/markets.html" class="btn btn-secondary">View Farmer</a>
        </div>
      </article>
    `).join('');

    document.getElementById('popularProducts').innerHTML = products.slice(0, 6).map((product) => `
      <article class="card product-card">
        <img src="${product.image}" alt="${product.name}">
        <div class="card-body">
          <h3>${product.name}</h3>
          <div class="product-price">${formatMoney(product.price)} / ${product.unit}</div>
          <div class="meta-row"><span>Stock: ${product.stock} ${product.unit}</span><span>${product.category}</span></div>
          <button class="btn btn-primary" onclick="addToCart('${product.id}', '${product.name}', ${product.price}, '${product.unit}')">Add to Cart</button>
        </div>
      </article>
    `).join('');
  });
}

function renderMarketsPage() {
  const root = document.getElementById('marketsPage');
  if (!root) return;

  api.get('/api/markets').then((markets) => {
    root.innerHTML = markets.map((market) => `
      <article class="card market-card">
        <img src="https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80" alt="${market.name}">
        <div class="card-body">
          <h3>${market.name}</h3>
          <div class="meta-row"><span>${market.day}</span><span>${market.openingTime} - ${market.closingTime}</span></div>
          <div class="muted">${market.address}</div>
          <div class="meta-row"><span>Lat: ${market.latitude}</span><span>Lng: ${market.longitude}</span></div>
          <a href="#" class="btn btn-primary">View Market</a>
        </div>
      </article>
    `).join('');
  });
}

function renderProductsPage() {
  const root = document.getElementById('productsPage');
  if (!root) return;

  const categorySelect = document.getElementById('categoryFilter');
  const searchField = document.getElementById('productSearch');

  const loadProducts = async () => {
    const url = new URL('/api/products', window.location.origin);
    if (categorySelect.value) url.searchParams.set('category', categorySelect.value);
    if (searchField.value) url.searchParams.set('search', searchField.value);

    const products = await api.get(url.toString().replace(window.location.origin, ''));
    root.innerHTML = products.map((product) => `
      <article class="card product-card">
        <img src="${product.image}" alt="${product.name}">
        <div class="card-body">
          <h3>${product.name}</h3>
          <div class="product-price">${formatMoney(product.price)} / ${product.unit}</div>
          <div class="meta-row"><span>Stock: ${product.stock}</span><span>${product.category}</span></div>
          <button class="btn btn-primary" onclick="addToCart('${product.id}', '${product.name}', ${product.price}, '${product.unit}')">Add to Cart</button>
        </div>
      </article>
    `).join('');
  };

  categorySelect.addEventListener('change', loadProducts);
  searchField.addEventListener('input', loadProducts);

  loadProducts();
}

function addToCart(productId, name, price, unit) {
  const existing = state.cart.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ productId, name, price, unit, quantity: 1 });
  }

  updateCartView();
}

function updateCartView() {
  const cartEl = document.getElementById('cartSummary');
  if (!cartEl) return;

  if (state.cart.length === 0) {
    cartEl.innerHTML = '<p class="muted">Your cart is empty.</p>';
    return;
  }

  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartEl.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <div>
        <strong>${item.name}</strong><br>
        <span class="muted">${item.quantity} ${item.unit} × ${formatMoney(item.price)}</span>
      </div>
      <strong>${formatMoney(item.quantity * item.price)}</strong>
    </div>
  `).join('') + `<hr><div class="meta-row"><strong>Total</strong><strong>${formatMoney(total)}</strong></div>`;
}

function renderCustomerDashboard() {
  const root = document.getElementById('customerDashboard');
  if (!root) return;

  const user = getCurrentUser();
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  api.get(`/api/dashboard/customer/${user.id}`).then((data) => {
    root.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="muted">Active Orders</div><div class="stat-value">${data.stats.activeOrders}</div></div>
        <div class="stat-card"><div class="muted">Favorites</div><div class="stat-value">${data.stats.favorites}</div></div>
        <div class="stat-card"><div class="muted">Past Orders</div><div class="stat-value">${data.stats.pastOrders}</div></div>
        <div class="stat-card"><div class="muted">Total Spent</div><div class="stat-value">${formatMoney(data.stats.totalSpent)}</div></div>
      </div>
      <div class="grid-3">
        <div class="content-panel">
          <h3>Latest Orders</h3>
          ${data.orders.map((order) => `
            <div class="cart-item">
              <div>
                <strong>${order.id}</strong><br>
                <span class="muted">${order.status}</span>
              </div>
              <span class="badge badge-success">${order.status}</span>
            </div>
          `).join('') || '<p class="muted">No orders yet.</p>'}
        </div>
        <div class="content-panel">
          <h3>Favorites</h3>
          ${data.favorites.map((item) => `<p>${item.name}</p>`).join('') || '<p class="muted">No favorites.</p>'}
        </div>
        <div class="content-panel">
          <h3>Notifications</h3>
          ${data.notifications.map((n) => `<p>🔔 ${n.message}</p>`).join('') || '<p class="muted">No notifications.</p>'}
        </div>
      </div>
    `;
  });
}

function renderFarmerDashboard() {
  const root = document.getElementById('farmerDashboard');
  if (!root) return;

  const user = getCurrentUser();
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  api.get(`/api/dashboard/farmer/${user.id}`).then((data) => {
    root.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="muted">Total Orders</div><div class="stat-value">${data.stats.totalOrders}</div></div>
        <div class="stat-card"><div class="muted">Pending Orders</div><div class="stat-value">${data.stats.pendingOrders}</div></div>
        <div class="stat-card"><div class="muted">Revenue</div><div class="stat-value">${formatMoney(data.stats.revenue)}</div></div>
        <div class="stat-card"><div class="muted">Best Seller</div><div class="stat-value">${data.stats.bestSeller}</div></div>
      </div>
      <div class="grid-3">
        <div class="content-panel">
          <h3>Incoming Orders</h3>
          ${data.orders.map((order) => `
            <div class="cart-item">
              <div><strong>${order.id}</strong><br><span class="muted">${order.status}</span></div>
              <button class="btn btn-secondary">Accept</button>
            </div>
          `).join('') || '<p class="muted">No orders yet.</p>'}
        </div>
        <div class="content-panel">
          <h3>Top Products</h3>
          ${data.insights.map((item) => `<p>${item.name} - ${item.orders} orders</p>`).join('')}
        </div>
        <div class="content-panel">
          <h3>My Products</h3>
          ${data.products.map((p) => `<p>${p.name} - ${p.stock} ${p.unit}</p>`).join('') || '<p class="muted">No products.</p>'}
        </div>
      </div>
    `;
  });
}

function renderAdminDashboard() {
  const root = document.getElementById('adminDashboard');
  if (!root) return;

  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '/index.html';
    return;
  }

  api.get(`/api/dashboard/admin/${user.id}`).then((data) => {
    root.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="muted">Total Customers</div><div class="stat-value">${data.stats.totalCustomers}</div></div>
        <div class="stat-card"><div class="muted">Total Farmers</div><div class="stat-value">${data.stats.totalFarmers}</div></div>
        <div class="stat-card"><div class="muted">Total Markets</div><div class="stat-value">${data.stats.totalMarkets}</div></div>
        <div class="stat-card"><div class="muted">Total Orders</div><div class="stat-value">${data.stats.totalOrders}</div></div>
      </div>
      <div class="grid-3">
        <div class="content-panel">
          <h3>Platform Reports</h3>
          ${data.reports.map((item) => `<p>${item.label}: ${item.value}</p>`).join('')}
        </div>
        <div class="content-panel">
          <h3>Farmers</h3>
          ${data.farmers.map((farmer) => `<p>${farmer.name}</p>`).join('')}
        </div>
        <div class="content-panel">
          <h3>Markets</h3>
          ${data.markets.map((market) => `<p>${market.name}</p>`).join('')}
        </div>
      </div>
    `;
  });
}

function initHomePage() {
  state.currentUser = getCurrentUser();
  renderHeaderUser();
  bindModalButtons();
  document.getElementById('loginForm').addEventListener('submit', loginUser);
  document.getElementById('registerForm').addEventListener('submit', registerUser);
  renderHomePage();
  updateCartView();
}

function initMarketsPage() {
  state.currentUser = getCurrentUser();
  renderHeaderUser();
  bindModalButtons();
  document.getElementById('loginForm').addEventListener('submit', loginUser);
  document.getElementById('registerForm').addEventListener('submit', registerUser);
  renderMarketsPage();
  updateCartView();
}

function initProductsPage() {
  state.currentUser = getCurrentUser();
  renderHeaderUser();
  bindModalButtons();
  document.getElementById('loginForm').addEventListener('submit', loginUser);
  document.getElementById('registerForm').addEventListener('submit', registerUser);
  renderProductsPage();
  updateCartView();
}

function initCustomerPage() {
  state.currentUser = getCurrentUser();
  renderHeaderUser();
  renderCustomerDashboard();
}

function initFarmerPage() {
  state.currentUser = getCurrentUser();
  renderHeaderUser();
  renderFarmerDashboard();
}

function initAdminPage() {
  state.currentUser = getCurrentUser();
  renderHeaderUser();
  renderAdminDashboard();
}

document.addEventListener('DOMContentLoaded', () => {
  const pathname = window.location.pathname;
  if (pathname === '/' || pathname === '/index.html') initHomePage();
  else if (pathname === '/markets.html') initMarketsPage();
  else if (pathname === '/products.html') initProductsPage();
  else if (pathname === '/customer.html') initCustomerPage();
  else if (pathname === '/farmer.html') initFarmerPage();
  else if (pathname === '/admin.html') initAdminPage();
});
