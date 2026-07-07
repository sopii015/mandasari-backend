const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Setup Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const wishlistRouter = require('./routes/wishlist');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Mandasari Premium API is running...',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
