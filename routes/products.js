const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyAdmin } = require('../middlewares/auth');

// GET /api/products - List all products with search & category filter
router.get('/', async (req, res) => {
  const { search, category, cat } = req.query;
  const filterCat = category || cat; // Support both category and cat

  try {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    if (filterCat) {
      query += ' AND category = ?';
      params.push(filterCat);
    }

    // Default sort by id descending (newest first)
    query += ' ORDER BY id DESC';

    const [products] = await db.query(query, params);

    // Convert fields to appropriate types (numbers)
    const formattedProducts = products.map(p => ({
      ...p,
      id: Number(p.id),
      price: Number(p.price),
      rating: p.rating ? Number(p.rating) : 5.0,
      stock: Number(p.stock),
      discount: Number(p.discount)
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data produk.' });
  }
});

// GET /api/products/:id - Get product detail
router.get('/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const [products] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    const p = products[0];
    const formattedProduct = {
      ...p,
      id: Number(p.id),
      price: Number(p.price),
      rating: p.rating ? Number(p.rating) : 5.0,
      stock: Number(p.stock),
      discount: Number(p.discount)
    };

    res.json(formattedProduct);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data detail produk.' });
  }
});

// POST /api/products - Create new product (Admin Only)
router.post('/', verifyAdmin, async (req, res) => {
  const { name, price, image, category, rating, stock, discount, badge, description } = req.body;

  if (!name || price === undefined || !image || !category || stock === undefined) {
    return res.status(400).json({ success: false, message: 'Nama, harga, image, kategori, dan stok wajib diisi.' });
  }

  try {
    const productRating = rating !== undefined ? rating : 5.0;
    const productDiscount = discount !== undefined ? discount : 0;
    const productBadge = badge || null;
    const productDesc = description || '';

    const [result] = await db.query(
      'INSERT INTO products (name, price, image, category, rating, stock, discount, badge, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, price, image, category, productRating, stock, productDiscount, productBadge, productDesc]
    );

    res.status(201).json({
      success: true,
      message: 'Produk berhasil ditambahkan.',
      product: {
        id: result.insertId,
        name,
        price: Number(price),
        image,
        category,
        rating: Number(productRating),
        stock: Number(stock),
        discount: Number(productDiscount),
        badge: productBadge,
        description: productDesc
      }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan produk.' });
  }
});

// PUT /api/products/:id - Update product (Admin Only)
router.put('/:id', verifyAdmin, async (req, res) => {
  const productId = req.params.id;
  const { name, price, image, category, rating, stock, discount, badge, description } = req.body;

  if (!name || price === undefined || !image || !category || stock === undefined) {
    return res.status(400).json({ success: false, message: 'Nama, harga, image, kategori, dan stok wajib diisi.' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    const productRating = rating !== undefined ? rating : 5.0;
    const productDiscount = discount !== undefined ? discount : 0;
    const productBadge = badge || null;
    const productDesc = description || '';

    await db.query(
      'UPDATE products SET name = ?, price = ?, image = ?, category = ?, rating = ?, stock = ?, discount = ?, badge = ?, description = ? WHERE id = ?',
      [name, price, image, category, productRating, stock, productDiscount, productBadge, productDesc, productId]
    );

    res.json({
      success: true,
      message: 'Produk berhasil diperbarui.',
      product: {
        id: Number(productId),
        name,
        price: Number(price),
        image,
        category,
        rating: Number(productRating),
        stock: Number(stock),
        discount: Number(productDiscount),
        badge: productBadge,
        description: productDesc
      }
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui produk.' });
  }
});

// DELETE /api/products/:id - Delete product (Admin Only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  const productId = req.params.id;

  try {
    const [existing] = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    await db.query('DELETE FROM products WHERE id = ?', [productId]);

    res.json({
      success: true,
      message: 'Produk berhasil dihapus.'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus produk.' });
  }
});

module.exports = router;
