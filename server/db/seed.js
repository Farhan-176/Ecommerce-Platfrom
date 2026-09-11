const bcrypt = require('bcryptjs');
const { initDb, getDb, run } = require('./database');

async function seed() {
  console.log('🌱 Initializing database schema...');
  initDb();
  const db = getDb();

  console.log('🧹 Clearing existing seed records...');
  db.exec('DELETE FROM order_items;');
  db.exec('DELETE FROM orders;');
  db.exec('DELETE FROM products;');
  db.exec('DELETE FROM users;');

  console.log('👤 Seeding default users (Admin & Customer)...');
  const adminHash = await bcrypt.hash('admin123', 10);
  const customerHash = await bcrypt.hash('customer123', 10);

  const adminResult = run(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
    ['Store Administrator', 'admin@store.com', adminHash, 'admin']
  );

  const customerResult = run(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
    ['Farhan Siddiqui', 'customer@store.com', customerHash, 'customer']
  );
  const customerId = customerResult.lastInsertRowid;

  console.log('📦 Seeding curated product catalog...');
  const products = [
    {
      name: 'Sony WH-1000XM5 Noise-Cancelling Headphones',
      description: 'Industry-leading noise cancellation with two processors and 8 microphones. Ultra-comfortable lightweight design and 30-hour battery life.',
      price: 398.00,
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      category: 'Audio',
      stock_count: 18,
      rating: 4.9
    },
    {
      name: 'Apple MacBook Pro 16" M3 Max',
      description: 'Liquid Retina XDR display with ProMotion, 36GB unified memory, and blazingly fast 14-core CPU built for extreme creative workflows.',
      price: 2499.00,
      image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
      category: 'Computing',
      stock_count: 8,
      rating: 5.0
    },
    {
      name: 'UltraWide Curved Gaming Monitor 34"',
      description: '165Hz refresh rate, 1ms response time, HDR400, and WQHD resolution delivering breathtaking immersion for gaming and multitasking.',
      price: 549.99,
      image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80',
      category: 'Gaming',
      stock_count: 12,
      rating: 4.7
    },
    {
      name: 'Mechanical RGB Custom Keyboard Pro',
      description: 'Hot-swappable tactile switches, gasket mount design, CNC aluminum case, and south-facing RGB illumination.',
      price: 159.00,
      image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
      category: 'Accessories',
      stock_count: 24,
      rating: 4.8
    },
    {
      name: 'Titanium Smartwatch Ultra GPS',
      description: 'Aerospace-grade titanium case, precision dual-frequency GPS, 100m water resistance, and ECG heart rate monitoring.',
      price: 799.00,
      image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
      category: 'Wearables',
      stock_count: 15,
      rating: 4.9
    },
    {
      name: 'Ergonomic Wireless Gaming Mouse',
      description: 'Hero 25K optical sensor with sub-micron precision, 68g lightweight architecture, and 90-hour wireless battery endurance.',
      price: 89.99,
      image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80',
      category: 'Gaming',
      stock_count: 32,
      rating: 4.6
    },
    {
      name: 'Leica Q3 Full-Frame Compact Camera',
      description: '60MP BSI CMOS sensor with Summilux 28mm f/1.7 ASPH lens, 8K video recording, and weather-sealed craftsmanship.',
      price: 3290.00,
      image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
      category: 'Electronics',
      stock_count: 3,
      rating: 4.9
    },
    {
      name: 'Studio Master Reference Audio Monitors',
      description: 'Bi-amplified studio nearfield monitor with 6.5" Kevlar woofer and precision waveguide for uncompromising acoustic accuracy.',
      price: 499.00,
      image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80',
      category: 'Audio',
      stock_count: 9,
      rating: 4.8
    },
    {
      name: 'MagSafe 3-in-1 Fast Wireless Stand',
      description: 'Charges iPhone, Apple Watch, and AirPods simultaneously with premium brushed aluminum and ambient LED indicator.',
      price: 129.50,
      image_url: 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=800&q=80',
      category: 'Accessories',
      stock_count: 45,
      rating: 4.7
    },
    {
      name: 'Smart Ambient Desk Lamp & Lightbar',
      description: 'Screen-glare-free asymmetric optical design, wireless remote dial, auto-dimming sensor, and RGB ambient backlighting.',
      price: 79.99,
      image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',
      category: 'Accessories',
      stock_count: 22,
      rating: 4.5
    },
    {
      name: 'Noise-Isolating True Wireless Earbuds',
      description: 'Spatial audio with dynamic head tracking, adaptive transparency mode, and IP54 dust and water resistance.',
      price: 199.95,
      image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
      category: 'Audio',
      stock_count: 30,
      rating: 4.8
    },
    {
      name: 'Developer Mechanical Trackball Mouse',
      description: 'Precision ergonomic contour reduces forearm strain by 20%, precision thumb ball navigation, and multi-device pairing.',
      price: 119.00,
      image_url: 'https://images.unsplash.com/photo-1626218174358-7769486c4b79?w=800&q=80',
      category: 'Computing',
      stock_count: 4,
      rating: 4.6
    },
    {
      name: 'Limited Edition Cyberpunk Headset',
      description: 'Custom neon etched chassis with dual chamber drivers and high-definition broadcast microphone.',
      price: 249.00,
      image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80',
      category: 'Gaming',
      stock_count: 0, // Intentionally 0 to test out-of-stock handling
      rating: 4.4
    },
    {
      name: 'Thunderbolt 4 Docking Station 14-Port',
      description: 'Single-cable dual 4K 60Hz display support, 98W host charging, 2.5Gb Ethernet, and blazing 40Gbps data transfers.',
      price: 289.00,
      image_url: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800&q=80',
      category: 'Computing',
      stock_count: 14,
      rating: 4.9
    },
    {
      name: 'Titanium Fitness & Sleep Tracker Ring',
      description: 'Ultra-discreet sensor tracking body temperature, sleep stages, HRV, and activity with 7-day battery life.',
      price: 299.00,
      image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
      category: 'Wearables',
      stock_count: 11,
      rating: 4.7
    },
    {
      name: 'Portable 4K OLED HDR Touch Monitor',
      description: '15.6" 100% DCI-P3 color gamut, 10-point capacitive touch, built-in kickstand, and USB-C single cable plug-and-play.',
      price: 389.00,
      image_url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=80',
      category: 'Electronics',
      stock_count: 7,
      rating: 4.8
    }
  ];

  const productIds = [];
  for (const p of products) {
    const res = run(
      `INSERT INTO products (name, description, price, image_url, category, stock_count, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.name, p.description, p.price, p.image_url, p.category, p.stock_count, p.rating]
    );
    productIds.push(res.lastInsertRowid);
  }

  console.log('🛒 Creating sample initial completed orders for Admin analytics...');
  // Seed sample order 1
  const order1 = run(
    `INSERT INTO orders (
      order_number, user_id, customer_name, customer_email, shipping_address,
      city, state, zip_code, phone, subtotal, tax, shipping_fee, discount,
      total_price, payment_method, payment_status, order_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-3 days'))`,
    [
      'ORD-89421', customerId, 'Farhan Siddiqui', 'customer@store.com', '124 Tech Valley Road',
      'San Jose', 'CA', '95112', '+1 (555) 349-2910', 398.00, 31.84, 0, 0,
      429.84, 'Card', 'Paid', 'Delivered'
    ]
  );
  run(
    `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [order1.lastInsertRowid, productIds[0], 'Sony WH-1000XM5 Noise-Cancelling Headphones', 398.00, 1, 398.00]
  );

  // Seed sample order 2
  const order2 = run(
    `INSERT INTO orders (
      order_number, user_id, customer_name, customer_email, shipping_address,
      city, state, zip_code, phone, subtotal, tax, shipping_fee, discount,
      total_price, payment_method, payment_status, order_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 day'))`,
    [
      'ORD-89422', customerId, 'Farhan Siddiqui', 'customer@store.com', '124 Tech Valley Road',
      'San Jose', 'CA', '95112', '+1 (555) 349-2910', 248.99, 19.92, 15.00, 20.00,
      263.91, 'Card', 'Paid', 'Processing'
    ]
  );
  run(
    `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [order2.lastInsertRowid, productIds[3], 'Mechanical RGB Custom Keyboard Pro', 159.00, 1, 159.00]
  );
  run(
    `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [order2.lastInsertRowid, productIds[5], 'Ergonomic Wireless Gaming Mouse', 89.99, 1, 89.99]
  );

  console.log('✅ Database seeded successfully!');
  console.log('--- Default Accounts ---');
  console.log('🔑 Admin: admin@store.com / admin123 (Role: admin)');
  console.log('🔑 Customer: customer@store.com / customer123 (Role: customer)');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = { seed };
