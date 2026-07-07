const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middlewares/auth');

// GET /api/cart - Get logged-in user's cart items
router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [cartItems] = await db.query(
      `SELECT p.id, p.name, p.price, p.image, p.stock, p.category, c.quantity
       FROM cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ?`,
      [userId]
    );

    const formattedCart = cartItems.map(item => ({
      id: Number(item.id),
      name: item.name,
      price: Number(item.price),
      image: item.image,
      stock: Number(item.stock),
      category: item.category,
      quantity: Number(item.quantity)
    }));

    res.json(formattedCart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data keranjang.' });
  }
});

// POST /api/cart - Add or update cart item
router.post('/', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { productId, id, quantity, overwrite } = req.body;
  const targetProductId = productId || id;
  const targetQuantity = quantity !== undefined ? Number(quantity) : 1;

  if (!targetProductId) {
    return res.status(400).json({ success: false, message: 'ID produk wajib disertakan.' });
  }

  try {
    // Cek apakah produk exist dan check stock
    const [products] = await db.query('SELECT stock FROM products WHERE id = ?', [targetProductId]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    const stock = Number(products[0].stock);

    // Cek apakah item sudah ada di keranjang
    const [existing] = await db.query(
      'SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?',
      [userId, targetProductId]
    );

    let newQuantity = targetQuantity;

    if (existing.length > 0) {
      if (overwrite) {
        newQuantity = targetQuantity;
      } else {
        newQuantity = Number(existing[0].quantity) + targetQuantity;
      }

      if (newQuantity > stock) {
        return res.status(400).json({ success: false, message: `Stok tidak mencukupi. Hanya tersedia ${stock} porsi.` });
      }

      if (newQuantity <= 0) {
        await db.query('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [userId, targetProductId]);
        return res.json({ success: true, message: 'Item dihapus dari keranjang karena jumlah <= 0.' });
      } else {
        await db.query(
          'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
          [newQuantity, userId, targetProductId]
        );
      }
    } else {
      if (newQuantity > stock) {
        return res.status(400).json({ success: false, message: `Stok tidak mencukupi. Hanya tersedia ${stock} porsi.` });
      }
      if (newQuantity <= 0) {
        return res.status(400).json({ success: false, message: 'Jumlah kuantitas tidak valid.' });
      }
      await db.query(
        'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, targetProductId, newQuantity]
      );
    }

    res.json({ success: true, message: 'Keranjang berhasil diperbarui.', quantity: newQuantity });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui keranjang.' });
  }
});

// DELETE /api/cart/:productId - Remove item from cart
router.delete('/:productId', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const productId = req.params.productId;

  try {
    await db.query('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId]);
    res.json({ success: true, message: 'Item berhasil dihapus dari keranjang.' });
  } catch (error) {
    console.error('Error deleting cart item:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus item dari keranjang.' });
  }
});

module.exports = router;
