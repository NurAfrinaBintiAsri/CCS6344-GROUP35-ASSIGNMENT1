const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit'); // ✅ Import rate limiter
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(cors({ origin: 'http://localhost:5500', credentials: true }));
app.use(express.json());
app.use(express.static('public'));

//Rate limiter (max 5 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }
});

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};


// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Fixed admin credentials
const FIXED_ADMIN_EMAIL = 'admin@gmail.com';
const FIXED_ADMIN_PASSWORD_HASH = '$2b$10$dXBsC5SrCJG1hsl5C6MP9.yQ3ubyLdxkid9ipD56aVBl5b0v6p7.a';

// Signup route
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = await sql.connect(dbConfig);

    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');

    if (existing.recordset.length > 0) {
      return res.json({ success: false, message: 'Email already registered' });
    }

    await pool.request()
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashedPassword)
      .query('INSERT INTO users (email, password) VALUES (@email, @password)');

    res.json({ success: true, message: 'User registered successfully', redirect: '/products.html' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

//User login with rate limiting
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT password FROM users WHERE email = @email');

    if (result.recordset.length === 0) {
      return res.json({ success: false, message: 'Invalid email or password.' });
    }

    const hashedPassword = result.recordset[0].password;
    const isMatch = await bcrypt.compare(password, hashedPassword);

    if (isMatch) {
      return res.json({ success: true, message: 'Login successful.', redirect: '/products.html' });
    } else {
      return res.json({ success: false, message: 'Invalid email or password.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

//Admin login with rate limiting
app.post('/admin', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

  try {
    if (email !== FIXED_ADMIN_EMAIL) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, FIXED_ADMIN_PASSWORD_HASH);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({ success: true, message: 'Admin login successful', redirect: '/admin-products.html' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all products
app.get('/products', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .query('SELECT product_id, product_name, product_price, category_name, image_url FROM products');
    res.json({ success: true, products: result.recordset });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add new product
app.post('/products', upload.single('image'), async (req, res) => {
  const { product_name, product_price, category_name } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!product_name || !product_price || !category_name) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('product_name', sql.NVarChar, product_name)
      .input('product_price', sql.Decimal(10, 2), product_price)
      .input('category_name', sql.NVarChar, category_name)
      .input('image_url', sql.NVarChar, imageUrl)
      .query('INSERT INTO products (product_name, product_price, category_name, image_url) VALUES (@product_name, @product_price, @category_name, @image_url)');
    res.json({ success: true, message: 'Product added successfully' });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Place order
app.post('/orders', async (req, res) => {
  const { items } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ success: false, message: "Missing order data" });
  }

  const pool = await sql.connect(dbConfig);
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const orderResult = await transaction.request()
      .input('total_amount', sql.Decimal(10, 2), totalAmount)
      .query(`INSERT INTO orders (total_amount) OUTPUT INSERTED.order_id VALUES (@total_amount)`);

    const order_id = orderResult.recordset[0].order_id;

    for (const item of items) {
      await transaction.request()
        .input('order_id', sql.Int, order_id)
        .input('image_url', sql.NVarChar, item.image_url)
        .input('product_name', sql.NVarChar, item.product_name)
        .input('category_name', sql.NVarChar, item.category_name)
        .input('price', sql.Decimal(10, 2), item.price)
        .input('quantity', sql.Int, item.quantity)
        .query(`INSERT INTO order_items (order_id, image_url, product_name, category_name, price, quantity) VALUES (@order_id, @image_url, @product_name, @category_name, @price, @quantity)`);
    }

    await transaction.commit();
    res.json({ success: true, message: 'Order placed successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error("Order error:", error);
    res.status(500).json({ success: false, message: 'Order placement failed' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
