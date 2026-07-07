-- Hapus tabel lama jika ada untuk mereset skema ke versi terbaru
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

-- 1. Tabel Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'customer',
  joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Products
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price INT NOT NULL,
  image VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  rating DECIMAL(3,2) DEFAULT 5.00,
  stock INT NOT NULL,
  discount INT DEFAULT 0,
  badge VARCHAR(50) DEFAULT NULL,
  description TEXT
);

-- 3. Tabel Wishlist
CREATE TABLE wishlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_wishlist (user_id, product_id)
);

-- 4. Tabel Cart
CREATE TABLE cart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_cart (user_id, product_id)
);

-- 5. Tabel Orders
CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  customer_id INT NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'Processing',
  total INT NOT NULL,
  paymentMethod VARCHAR(100) NOT NULL,
  penerima VARCHAR(255) NOT NULL,
  telepon VARCHAR(50) NOT NULL,
  alamatLengkap TEXT NOT NULL,
  catatan TEXT,
  subtotal INT NOT NULL,
  layanan INT DEFAULT 0,
  totalBayar INT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Tabel Order Items (Detail Order)
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  product_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  price INT NOT NULL,
  image VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  rating INT DEFAULT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- --- SEED DATA ---

-- Tambahkan default Admin (password: mandasari123)
INSERT INTO users (name, email, password, role)
VALUES ('Admin Mandasari', 'admin@mandasari.com', '$2b$10$ZfdJh9aadugk6ejUmGA.e.jBN1ajA07J2KSjoh8p9DqVf7SuMgmPm', 'admin')
ON DUPLICATE KEY UPDATE id=id;

-- Tambahkan default Customer (password: customer123 -> $2b$10$R9n/tN6g2D6hLks3kY9q2e9Uv6aJ7jXh1tKjP9K8uI1OQW0gH8C7q)
INSERT INTO users (name, email, password, role)
VALUES ('Budi Santoso', 'budi@gmail.com', '$2b$10$R9n/tN6g2D6hLks3kY9q2e9Uv6aJ7jXh1tKjP9K8uI1OQW0gH8C7q', 'customer')
ON DUPLICATE KEY UPDATE id=id;

-- Tambahkan Katalog Produk Kue
INSERT INTO products (id, name, price, image, category, rating, stock, discount, badge, description) VALUES
(1, 'Signature Fudgy Brownies', 85000, 'https://images.unsplash.com/photo-1541801588-6811f3499be4?w=400&h=400&fit=crop&auto=format', 'Brownies', 4.9, 20, 0, 'Best Seller', 'Brownies panggang dengan tekstur fudgy yang intens, menggunakan dark chocolate premium dan topping almond renyah.'),
(2, 'Lotus Biscoff Cheesecake', 175000, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=400&fit=crop&auto=format', 'Cakes', 4.8, 10, 10, 'New', 'Cheesecake lembut dengan lapisan selai Lotus Biscoff dan biskuit renyah di bagian bawah. Perpaduan rasa manis dan gurih.'),
(3, 'Classic Butter Croissant', 22000, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop&auto=format', 'Pastry', 4.7, 50, 0, 'Daily Fresh', 'Pastry berlapis yang sangat flaky and buttery. Dibuat dengan teknik tradisional Perancis menggunakan butter berkualitas tinggi.'),
(4, 'Nastar Wisman Premium', 125000, 'https://images.unsplash.com/photo-1610631787813-9eeb1a2386cc?w=400&h=400&fit=crop&auto=format', 'Cookies', 4.9, 15, 0, 'Signature', 'Kue kering nastar dengan selai nanas homemade yang segar dan mentega Wisman yang harum. Lembut dan lumer di mulut.'),
(5, 'Red Velvet Layer Cake', 210000, 'https://images.unsplash.com/photo-1586788680434-30d324671ff6?w=400&h=400&fit=crop&auto=format', 'Cakes', 4.6, 5, 5, '', 'Kue Red Velvet berlapis dengan cream cheese frosting yang ringan. Cocok untuk perayaan ulang tahun atau acara spesial.'),
(6, 'Triple Chocolate Muffin', 18000, 'https://images.unsplash.com/photo-1557925923-33b27f891f88?w=400&h=400&fit=crop&auto=format', 'Pastry', 4.5, 30, 0, '', 'Muffin cokelat lembab dengan isian choco chips melimpah di dalam dan di atasnya. Favorit anak-anak!'),
(7, 'Cheese Sago Cookies', 95000, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop&auto=format', 'Cookies', 4.8, 25, 0, '', 'Kue sagu keju yang renyah namun langsung lumer saat dimakan. Menggunakan keju edam asli untuk rasa gurih yang maksimal.'),
(8, 'Korean Garlic Cheese Bread', 35000, 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=400&h=400&fit=crop&auto=format', 'Pastry', 4.7, 12, 0, 'Popular', 'Roti lembut dengan isian cream cheese melimpah dan disiram dengan saus bawang putih mentega yang gurih.'),
(9, 'Durian Mille Crepes', 45000, 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop&auto=format', 'Cakes', 4.9, 8, 0, 'Limited', 'Kue lapis tipis (crepes) dengan krim durian asli Medan di setiap lapisannya. Manis, legit, dan sangat lembut.'),
(10, 'Almond Crispy Cheese', 65000, 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&h=400&fit=crop&auto=format', 'Cookies', 4.6, 40, 15, '', 'Camilan tipis dan sangat renyah dengan taburan almond slice dan keju parut di atasnya. Sangat adiktif!')
ON DUPLICATE KEY UPDATE id=values(id), name=values(name), price=values(price), image=values(image), category=values(category), rating=values(rating), stock=values(stock), discount=values(discount), badge=values(badge), description=values(description);
