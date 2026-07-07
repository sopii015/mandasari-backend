const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middlewares/auth');

// GET /api/wishlist - Get logged-in user's wishlist items
router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [wishlistItems] = await db.query(
      `SELECT p.* FROM wishlist w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ?`,
      [userId]
    );

    const formattedProducts = wishlistItems.map(p => ({
      ...p,
      id: Number(p.id),
      price: Number(p.price),
      rating: p.rating ? Number(p.rating) : 5.0,
      stock: Number(p.stock),
      discount: Number(p.discount)
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data wishlist.' });
  }
});

// POST /api/wishlist/:productId - Toggle wishlist item
router.post('/:productId', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const productId = req.params.productId;

  try {
    // Cek apakah produk exist
    const [products] = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    // Cek apakah item sudah ada di wishlist
    const [existing] = await db.query(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existing.length > 0) {
      // Jika ada, hapus (toggle off)
      await db.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, productId]);
      return res.json({ success: true, message: 'Dihapus dari wishlist.', isFavorite: false });
    } else {
      // Jika tidak ada, tambah (toggle on)
      await db.query('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [userId, productId]);
      return res.json({ success: true, message: 'Berhasil simpan ke wishlist.', isFavorite: true });
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    res.status(500).json({ success: false, message: 'Gagal mengubah wishlist.' });
  }
});

module.exports = router;
