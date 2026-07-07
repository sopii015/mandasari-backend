const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');

// Helper to generate transaction ID
// Format: MDS-YYMMDD-RANDOM (e.g. MDS-260421-K8A9B)
const makeIdTransaksi = () => {
  const tgl = new Date();
  const yy = tgl.getFullYear().toString().slice(-2);
  const mm = String(tgl.getMonth() + 1).padStart(2, '0');
  const dd = String(tgl.getDate()).padStart(2, '0');
  
  const karakter = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomStr = '';
  for (let i = 0; i < 5; i++) {
    randomStr += karakter.charAt(Math.floor(Math.random() * karakter.length));
  }

  return `MDS-${yy}${mm}${dd}-${randomStr}`;
};

// Helper to format currency to IDR
const formatRupiah = (angka) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
};

// POST /api/checkout - Create order from cart and empty cart
router.post('/checkout', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { dataPengiriman, paymentMethod } = req.body;

  if (!dataPengiriman || !paymentMethod) {
    return res.status(400).json({ success: false, message: 'Data pengiriman dan metode pembayaran wajib diisi.' });
  }

  const { nama, hp, alamat, catatan } = dataPengiriman;
  if (!nama || !hp || !alamat) {
    return res.status(400).json({ success: false, message: 'Nama penerima, telepon, dan alamat lengkap wajib diisi.' });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Ambil item di cart user
    const [cartItems] = await connection.query(
      `SELECT c.product_id, c.quantity, p.name, p.price, p.image, p.category, p.stock
       FROM cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ?`,
      [userId]
    );

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Keranjang belanja kosong.' });
    }

    // 2. Validasi stok produk
    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Stok produk '${item.name}' tidak mencukupi. Hanya tersedia ${item.stock} porsi.`
        });
      }
    }

    // 3. Hitung ringkasan biaya
    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const layanan = 0; // Gratis ongkir
    const totalBayar = subtotal + layanan;

    // 4. Buat header order
    const orderId = makeIdTransaksi();
    await connection.query(
      `INSERT INTO orders (id, customer_id, customer_name, customer_email, status, total, paymentMethod, penerima, telepon, alamatLengkap, catatan, subtotal, layanan, totalBayar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        userId,
        req.user.name,
        req.user.email,
        'Processing',
        totalBayar,
        paymentMethod,
        nama,
        hp,
        alamat,
        catatan || '-',
        subtotal,
        layanan,
        totalBayar
      ]
    );

    // 5. Buat detail order & kurangi stok produk
    for (const item of cartItems) {
      // Masukkan ke order_items
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, name, price, image, category, quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.name, item.price, item.image, item.category, item.quantity]
      );

      // Kurangi stok produk
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // 6. Kosongkan keranjang belanja user
    await connection.query('DELETE FROM cart WHERE user_id = ?', [userId]);

    await connection.commit();

    // 7. Generate ringkasan untuk WhatsApp
    const listItemTxt = cartItems
      .map((item, index) => `${index + 1}. ${item.name} (${item.quantity}x)`)
      .join('\n');

    const rawMessage = `Halo Owner Mandasari Premium, berikut ringkasan pesanan baru:

🛍️ *Pesanan Kue Mandasari*
- *ID Order:* ${orderId}
- *Customer:* ${req.user.name} (${req.user.email})
- *Metode Bayar:* ${paymentMethod}

📍 *Alamat Pengiriman:*
- *Penerima:* ${nama}
- *Telepon:* ${hp}
- *Alamat:* ${alamat}
- *Catatan:* ${catatan || '-'}

🍰 *Item Pesanan:*
${listItemTxt}

💵 *Rincian Biaya:*
- *Subtotal:* ${formatRupiah(subtotal)}
- *Ongkir/Layanan:* ${layanan === 0 ? 'Gratis' : formatRupiah(layanan)}
- *Total Bayar:* *${formatRupiah(totalBayar)}*

Mohon segera diproses ya!`;

    const encodedMessage = encodeURIComponent(rawMessage);
    const ownerPhone = process.env.OWNER_PHONE || '6285773153093';
    const whatsappUrl = `https://wa.me/${ownerPhone}?text=${encodedMessage}`;

    res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dibuat.',
      orderId,
      whatsappUrl,
      order: {
        id: orderId,
        customerId: userId,
        customerName: req.user.name,
        customerEmail: req.user.email,
        date: new Date().toISOString(),
        status: 'Processing',
        items: cartItems.map(item => ({
          id: Number(item.product_id),
          name: item.name,
          price: Number(item.price),
          image: item.image,
          category: item.category,
          quantity: Number(item.quantity)
        })),
        total: totalBayar,
        paymentMethod,
        pengiriman: {
          penerima: nama,
          telepon: hp,
          alamatLengkap: alamat,
          catatan: catatan || '-'
        },
        rincianBiaya: {
          subtotal,
          layanan,
          totalBayar
        }
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error during checkout transaction:', error);
    res.status(500).json({ success: false, message: 'Gagal memproses pesanan.' });
  } finally {
    connection.release();
  }
});

// GET /api/orders - Get order history of logged-in user
router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let ordersQuery = '';
    let params = [];

    if (userRole === 'admin') {
      // Admin can see all orders
      ordersQuery = 'SELECT * FROM orders ORDER BY date DESC';
    } else {
      // Customer can only see their own orders
      ordersQuery = 'SELECT * FROM orders WHERE customer_id = ? ORDER BY date DESC';
      params.push(userId);
    }

    const [orders] = await db.query(ordersQuery, params);

    const formattedOrders = [];
    for (const order of orders) {
      const [items] = await db.query(
        `SELECT product_id as id, name, price, image, category, quantity, rating
         FROM order_items WHERE order_id = ?`,
        [order.id]
      );

      formattedOrders.push({
        id: order.id,
        customerId: Number(order.customer_id),
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        date: order.date,
        status: order.status,
        items: items.map(item => ({
          id: Number(item.id),
          name: item.name,
          price: Number(item.price),
          image: item.image,
          category: item.category,
          quantity: Number(item.quantity),
          rating: item.rating ? Number(item.rating) : null
        })),
        total: Number(order.total),
        paymentMethod: order.paymentMethod,
        pengiriman: {
          penerima: order.penerima,
          telepon: order.telepon,
          alamatLengkap: order.alamatLengkap,
          catatan: order.catatan
        },
        rincianBiaya: {
          subtotal: Number(order.subtotal),
          layanan: Number(order.layanan),
          totalBayar: Number(order.totalBayar)
        }
      });
    }

    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat pesanan.' });
  }
});

// GET /api/orders/:id - Get order details by ID
router.get('/:id', verifyToken, async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    const order = orders[0];

    // Cek otorisasi: admin atau pemilik order
    if (userRole !== 'admin' && Number(order.customer_id) !== userId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const [items] = await db.query(
      `SELECT product_id as id, name, price, image, category, quantity, rating
       FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    const formattedOrder = {
      id: order.id,
      customerId: Number(order.customer_id),
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      date: order.date,
      status: order.status,
      items: items.map(item => ({
        id: Number(item.id),
        name: item.name,
        price: Number(item.price),
        image: item.image,
        category: item.category,
        quantity: Number(item.quantity),
        rating: item.rating ? Number(item.rating) : null
      })),
      total: Number(order.total),
      paymentMethod: order.paymentMethod,
      pengiriman: {
        penerima: order.penerima,
        telepon: order.telepon,
        alamatLengkap: order.alamatLengkap,
        catatan: order.catatan
      },
      rincianBiaya: {
        subtotal: Number(order.subtotal),
        layanan: Number(order.layanan),
        totalBayar: Number(order.totalBayar)
      }
    };

    res.json(formattedOrder);
  } catch (error) {
    console.error('Error fetching order detail:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil detail pesanan.' });
  }
});

// PUT /api/orders/:id/status - Update order status (Admin Only)
router.put('/:id/status', verifyAdmin, async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  const validStatuses = ['Processing', 'Shipped', 'Delivered'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Status tidak valid. Harus salah satu dari Processing, Shipped, atau Delivered.' });
  }

  try {
    const [orders] = await db.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);

    res.json({ success: true, message: `Status pesanan berhasil diubah menjadi: ${status}` });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui status pesanan.' });
  }
});

// POST /api/orders/:id/items/:productId/rate - Rate a product in a completed order
router.post('/:id/items/:productId/rate', verifyToken, async (req, res) => {
  const orderId = req.params.id;
  const productId = req.params.productId;
  const { rating } = req.body;
  const userId = req.user.id;

  if (rating === undefined || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating tidak valid. Harus bernilai 1 sampai 5.' });
  }

  try {
    // Pastikan order ini milik user yang sedang login dan statusnya 'Delivered'
    const [orders] = await db.query('SELECT customer_id, status FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    const order = orders[0];
    if (Number(order.customer_id) !== userId) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk menilai item pada pesanan ini.' });
    }

    if (order.status !== 'Delivered') {
      return res.status(400).json({ success: false, message: 'Anda hanya dapat memberi rating pada pesanan yang sudah berstatus Selesai (Delivered).' });
    }

    // Pastikan item ada dalam order
    const [items] = await db.query(
      'SELECT id FROM order_items WHERE order_id = ? AND product_id = ?',
      [orderId, productId]
    );

    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item produk tidak ditemukan dalam pesanan ini.' });
    }

    // Update rating di order_items
    await db.query(
      'UPDATE order_items SET rating = ? WHERE order_id = ? AND product_id = ?',
      [rating, orderId, productId]
    );

    // Hitung rata-rata rating baru untuk produk tersebut
    const [ratingStats] = await db.query(
      'SELECT AVG(rating) as avgRating FROM order_items WHERE product_id = ? AND rating IS NOT NULL',
      [productId]
    );

    if (ratingStats.length > 0 && ratingStats[0].avgRating !== null) {
      const newAvgRating = parseFloat(Number(ratingStats[0].avgRating).toFixed(1));
      // Update rating produk di tabel products
      await db.query('UPDATE products SET rating = ? WHERE id = ?', [newAvgRating, productId]);
    }

    res.json({ success: true, message: 'Terima kasih atas ulasan Anda!' });
  } catch (error) {
    console.error('Error rating product in order:', error);
    res.status(500).json({ success: false, message: 'Gagal memberikan rating.' });
  }
});

module.exports = router;
