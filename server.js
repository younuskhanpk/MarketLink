const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'db.json');

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function readDb() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeDb(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getUserSafe(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt
  };
}

function findUserByEmail(db, email) {
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'MarketLink', time: new Date().toISOString() });
});

app.get('/api/public-data', (req, res) => {
  const db = readDb();
  const response = {
    markets: db.markets,
    farmers: db.farmers,
    products: db.products,
    categories: db.categories,
    reviews: db.reviews,
    announcements: db.announcements,
    featuredMarkets: db.markets.slice(0, 3),
    featuredFarmers: db.farmers.slice(0, 4),
    popularProducts: db.products.slice(0, 6)
  };
  res.json(response);
});

app.get('/api/markets', (req, res) => {
  const db = readDb();
  res.json(db.markets);
});

app.get('/api/farmers', (req, res) => {
  const db = readDb();
  res.json(db.farmers);
});

app.get('/api/products', (req, res) => {
  const db = readDb();
  let products = [...db.products];
  const { category, marketId, farmerId, search } = req.query;

  if (category) {
    products = products.filter((p) => p.category === category);
  }
  if (marketId) {
    products = products.filter((p) => p.marketId === marketId);
  }
  if (farmerId) {
    products = products.filter((p) => p.farmerId === farmerId);
  }
  if (search) {
    const q = search.toLowerCase();
    products = products.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(q));
  }

  res.json(products);
});

app.get('/api/reviews/:productId', (req, res) => {
  const db = readDb();
  const reviews = db.reviews.filter((r) => r.productId === req.params.productId);
  res.json(reviews);
});

app.post('/api/register', (req, res) => {
  const db = readDb();
  const { name, email, phone, password, address, role = 'customer' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  if (findUserByEmail(db, email)) {
    return res.status(409).json({ message: 'Email already registered.' });
  }

  const user = {
    id: `U-${Date.now()}`,
    name,
    email,
    phone: phone || '',
    address: address || '',
    passwordHash: hashPassword(password),
    role,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  writeDb(db);

  res.status(201).json({
    message: 'Registration successful.',
    user: getUserSafe(user)
  });
});

app.post('/api/login', (req, res) => {
  const db = readDb();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = findUserByEmail(db, email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ message: 'Account is not active.' });
  }

  res.json({
    message: 'Login successful.',
    user: getUserSafe(user)
  });
});

app.get('/api/dashboard/:role/:userId', (req, res) => {
  const db = readDb();
  const { role, userId } = req.params;

  if (role === 'customer') {
    const orders = db.orders.filter((order) => order.customerId === userId);
    const products = db.products.slice(0, 3);
    res.json({
      stats: {
        activeOrders: orders.filter((o) => ['PLACED', 'ACCEPTED', 'READY FOR PICKUP'].includes(o.status)).length,
        favorites: 8,
        pastOrders: orders.length,
        totalSpent: orders.reduce((sum, order) => sum + Number(order.total), 0)
      },
      orders: orders.slice(0, 5),
      favorites: db.favorites.filter((f) => f.userId === userId).slice(0, 6),
      products,
      notifications: db.notifications.filter((n) => n.userId === userId).slice(0, 4)
    });
  }

  if (role === 'farmer') {
    const orders = db.orders.filter((order) => order.farmerId === userId);
    const products = db.products.filter((p) => p.farmerId === userId);
    res.json({
      stats: {
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === 'PLACED' || o.status === 'ACCEPTED').length,
        revenue: orders.reduce((sum, order) => sum + Number(order.total), 0),
        bestSeller: 'Tomatoes'
      },
      orders: orders.slice(0, 5),
      products,
      insights: [
        { name: 'Tomatoes', orders: 124 },
        { name: 'Apples', orders: 87 },
        { name: 'Potatoes', orders: 61 }
      ]
    });
  }

  if (role === 'admin') {
    res.json({
      stats: {
        totalCustomers: db.users.filter((u) => u.role === 'customer').length,
        totalFarmers: db.users.filter((u) => u.role === 'farmer').length,
        totalMarkets: db.markets.length,
        totalOrders: db.orders.length,
        monthlyRevenue: 85000,
        completedOrders: db.orders.filter((o) => o.status === 'COMPLETED').length
      },
      farmers: db.farmers,
      customers: db.users.filter((u) => u.role === 'customer'),
      markets: db.markets,
      reports: [
        { label: 'Orders', value: 1245 },
        { label: 'Completed', value: 1102 },
        { label: 'Cancelled', value: 143 },
        { label: 'Revenue', value: 'Rs. 950,000' }
      ]
    });
  }

  res.json({ stats: {} });
});

app.post('/api/orders', (req, res) => {
  const db = readDb();
  const { customerId, farmerId, marketId, pickupSlotId, items } = req.body;

  if (!customerId || !farmerId || !marketId || !items || items.length === 0) {
    return res.status(400).json({ message: 'Order data is incomplete.' });
  }

  const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const order = {
    id: `ML-${Date.now()}`,
    customerId,
    farmerId,
    marketId,
    pickupSlotId,
    status: 'PLACED',
    orderDate: new Date().toISOString(),
    total,
    items,
    customerName: 'Customer',
    farmerName: 'Farmer'
  };

  db.orders.push(order);
  db.notifications.push({
    id: `N-${Date.now()}`,
    userId: customerId,
    type: 'order-confirmed',
    message: `Your order ${order.id} has been placed and accepted.`
  });
  writeDb(db);

  res.status(201).json({ message: 'Pre-order created successfully.', order });
});

app.get('/api/orders/:userId', (req, res) => {
  const db = readDb();
  const { userId } = req.params;
  const orders = db.orders.filter((order) => order.customerId === userId || order.farmerId === userId);
  res.json(orders);
});

app.post('/api/reviews', (req, res) => {
  const db = readDb();
  const { productId, customerId, rating, comment } = req.body;

  if (!productId || !customerId || !rating) {
    return res.status(400).json({ message: 'Review data is incomplete.' });
  }

  const review = {
    id: `R-${Date.now()}`,
    productId,
    customerId,
    rating: Number(rating),
    comment: comment || '',
    createdAt: new Date().toISOString()
  };

  db.reviews.push(review);
  writeDb(db);

  res.status(201).json({ message: 'Review submitted.', review });
});

app.post('/api/favorites', (req, res) => {
  const db = readDb();
  const { userId, type, itemId, name } = req.body;
  const favorite = { id: `F-${Date.now()}`, userId, type, itemId, name };
  db.favorites.push(favorite);
  writeDb(db);
  res.status(201).json({ message: 'Added to favorites.', favorite });
});

app.get('*', (req, res) => {
  const normalized = req.path === '/' ? '/index.html' : req.path;
  const filePath = path.join(publicDir, normalized.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.sendFile(filePath);
    return;
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MarketLink app is running on http://localhost:${PORT}`);
});

