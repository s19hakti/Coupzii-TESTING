require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const users = [];
const brands = [];
const coupons = [];
const wallet = [];

const sign = (u) => jwt.sign(
  { id: u.id, email: u.email, type: u.type },
  process.env.JWT_SECRET || 'coupzii2024',
  { expiresIn: '24h' }
);

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Login required' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET || 'coupzii2024'); next(); }
  catch { res.status(403).json({ error: 'Invalid token' }); }
};

app.get('/', (req, res) => res.json({ message: '🎫 Coupzii API is Live!', status: 'OK' }));
app.get('/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

app.post('/api/auth/register/user', async (req, res) => {
  const { email, password, full_name, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Already exists' });
  const u = { id: uuidv4(), email, password_hash: await bcrypt.hash(password, 10), full_name, phone, type: 'user' };
  users.push(u);
  res.status(201).json({ message: 'Registered!', token: sign(u), user: { id: u.id, email, full_name, type: 'user' } });
});

app.post('/api/auth/register/brand', async (req, res) => {
  const { email, password, brand_name, category } = req.body;
  if (!email || !password || !brand_name) return res.status(400).json({ error: 'All fields required' });
  if (brands.find(b => b.email === email)) return res.status(400).json({ error: 'Already exists' });
  const b = { id: uuidv4(), email, password_hash: await bcrypt.hash(password, 10), brand_name, category, type: 'brand' };
  brands.push(b);
  res.status(201).json({ message: 'Brand registered!', token: sign(b), brand: { id: b.id, email, brand_name, type: 'brand' } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, login_type } = req.body;
  const list = login_type === 'brand' ? brands : users;
  const u = list.find(x => x.email === email);
  if (!u || !await bcrypt.compare(password, u.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ message: 'Login successful!', token: sign(u), type: u.type, user: { id: u.id, email: u.email, name: u.full_name || u.brand_name } });
});

app.get('/api/user/wallet', auth, (req, res) => {
  const items = wallet.filter(w => w.user_id === req.user.id).map(w => ({ ...w, ...coupons.find(c => c.id === w.coupon_id) }));
  res.json({ coupons: items, total: items.length });
});

app.post('/api/user/wallet/add', auth, (req, res) => {
  const { coupon_code, brand, discount, title } = req.body;
  const c = { id: uuidv4(), coupon_code, title: title || brand || 'Coupon', brand, discount_value: discount, is_active: true };
  coupons.push(c);
  wallet.push({ id: uuidv4(), user_id: req.user.id, coupon_id: c.id, added_at: new Date() });
  res.status(201).json({ message: 'Added to wallet!', coupon: c });
});

app.get('/api/user/wallet/stats', auth, (req, res) => {
  res.json({ active_coupons: wallet.filter(w => w.user_id === req.user.id).length, total_savings: 0 });
});

app.get('/api/marketplace', (req, res) => res.json({ listings: [], total: 0 }));

app.post('/api/brand/coupon/create', auth, (req, res) => {
  const c = { id: uuidv4(), brand_id: req.user.id, ...req.body, is_active: true, created_at: new Date() };
  coupons.push(c);
  res.status(201).json({ message: 'Coupon created!', coupon: c });
});

app.get('/api/brand/coupons', auth, (req, res) => {
  res.json({ coupons: coupons.filter(c => c.brand_id === req.user.id) });
});

app.get('/api/brand/analytics', auth, (req, res) => {
  const bc = coupons.filter(c => c.brand_id === req.user.id);
  res.json({ total_coupons: bc.length, active_coupons: bc.length, total_redemptions: 0, total_views: 0 });
});

app.post('/api/ai/chat', auth, (req, res) => {
  const msg = (req.body.message || '').toLowerCase();
  let response = 'Hi! I am your Coupzii AI Assistant! Ask me to find coupons or analyze your cart!';
  if (msg.includes('zara')) response = 'I found ZARA coupons! Check Brand Marketplace for 50% OFF deals!';
  else if (msg.includes('wallet')) response = `You have ${wallet.filter(w => w.user_id === req.user.id).length} coupons in your wallet!`;
  else if (msg.includes('best')) response = 'Best deal today: 60% OFF at H&M! Check the marketplace!';
  res.json({ response });
});

app.post('/api/payment/create-order', auth, (req, res) => {
  res.json({ order_id: `order_${Date.now()}`, amount: req.body.amount * 100, currency: 'INR', status: 'created' });
});

app.listen(PORT, () => console.log(`🚀 Coupzii running on port ${PORT}`));
module.exports = app;
