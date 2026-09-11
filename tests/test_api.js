const assert = require('node:assert');
const { seed } = require('../server/db/seed');
const app = require('../server/app');

let server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log('🧪 Starting Full-Stack E-Commerce Platform Test Suite...\n');

  // 1. Seed database
  await seed();

  // Start temporary server for testing
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
  console.log(`📡 Test server running on port ${PORT}`);

  try {
    let customerToken = '';
    let adminToken = '';

    // ==========================================
    // TEST 1: Authentication & RBAC
    // ==========================================
    console.log('\n--- 1. Testing Authentication & RBAC ---');

    // Customer Login
    const custLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@store.com', password: 'customer123' })
    });
    const custLoginData = await custLoginRes.json();
    assert.strictEqual(custLoginRes.status, 200, 'Customer login should return 200');
    assert.ok(custLoginData.token, 'Customer login should return token');
    assert.strictEqual(custLoginData.user.role, 'customer', 'Role should be customer');
    customerToken = custLoginData.token;
    console.log('✅ Customer login verified');

    // Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@store.com', password: 'admin123' })
    });
    const adminLoginData = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login should return 200');
    assert.ok(adminLoginData.token, 'Admin login should return token');
    assert.strictEqual(adminLoginData.user.role, 'admin', 'Role should be admin');
    adminToken = adminLoginData.token;
    console.log('✅ Admin login verified');

    // RBAC: Admin route without token -> 401
    const unauthAdminRes = await fetch(`${BASE_URL}/admin/stats`);
    assert.strictEqual(unauthAdminRes.status, 401, 'Unauthenticated admin request must return 401');
    console.log('✅ RBAC check: Unauthenticated rejected (401)');

    // RBAC: Admin route with customer token -> 403
    const forbiddenAdminRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert.strictEqual(forbiddenAdminRes.status, 403, 'Customer accessing admin route must return 403');
    console.log('✅ RBAC check: Regular customer forbidden from admin stats (403)');

    // RBAC: Admin route with admin token -> 200
    const adminStatsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminStatsData = await adminStatsRes.json();
    assert.strictEqual(adminStatsRes.status, 200, 'Admin accessing admin stats must return 200');
    assert.ok(adminStatsData.stats.totalRevenue >= 0, 'Admin stats must return totalRevenue');
    console.log(`✅ RBAC check: Admin authorized (200), totalRevenue: $${adminStatsData.stats.totalRevenue}`);

    // ==========================================
    // TEST 2: Product Catalog Filtering, Sorting, Pagination
    // ==========================================
    console.log('\n--- 2. Testing Product Catalog, Filters, and Pagination ---');

    // Fetch default catalog (limit 8, page 1)
    const catRes = await fetch(`${BASE_URL}/products?limit=6&page=1`);
    const catData = await catRes.json();
    assert.strictEqual(catRes.status, 200);
    assert.strictEqual(catData.products.length, 6, 'Should return exactly 6 products for limit=6');
    assert.strictEqual(catData.pagination.page, 1, 'Current page should be 1');
    assert.ok(catData.pagination.totalPages >= 2, 'Total pages should be >= 2');
    console.log(`✅ Pagination verified: Page 1 of ${catData.pagination.totalPages} (${catData.pagination.total} total items)`);

    // Category filter: "Audio"
    const audioRes = await fetch(`${BASE_URL}/products?category=Audio`);
    const audioData = await audioRes.json();
    assert.ok(audioData.products.length > 0, 'Audio products should exist');
    for (const p of audioData.products) {
      assert.strictEqual(p.category, 'Audio', `Product ${p.name} category must be Audio`);
    }
    console.log(`✅ Category filtering verified: Found ${audioData.products.length} Audio items`);

    // Search query: "MacBook"
    const searchRes = await fetch(`${BASE_URL}/products?search=MacBook`);
    const searchData = await searchRes.json();
    assert.ok(searchData.products.length >= 1, 'Search for MacBook should return results');
    console.log(`✅ Search verified: Found "${searchData.products[0].name}"`);

    // Sort order: price_asc
    const sortRes = await fetch(`${BASE_URL}/products?sort=price_asc&limit=10`);
    const sortData = await sortRes.json();
    for (let i = 0; i < sortData.products.length - 1; i++) {
      assert.ok(
        sortData.products[i].price <= sortData.products[i + 1].price,
        'Products must be sorted in ascending price'
      );
    }
    console.log('✅ Price sorting (Low to High) verified');

    // ==========================================
    // TEST 3: Checkout Processing & Atomic Inventory Deduction
    // ==========================================
    console.log('\n--- 3. Testing Checkout & Atomic Inventory Deduction ---');

    // Fetch the first product to use dynamically
    const catalogListRes = await fetch(`${BASE_URL}/products?limit=1`);
    const catalogListData = await catalogListRes.json();
    const targetProduct = catalogListData.products[0];
    const targetId = targetProduct.id;
    const initialStock = targetProduct.stock_count;
    console.log(`ℹ️ Target Product #${targetId} ("${targetProduct.name}") initial stock: ${initialStock}`);

    // Place successful checkout for 2 units
    const checkoutRes = await fetch(`${BASE_URL}/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        items: [{ productId: targetId, quantity: 2 }],
        customerName: 'Farhan Siddiqui',
        customerEmail: 'customer@store.com',
        shippingAddress: '123 Innovation Drive',
        city: 'Silicon Valley',
        state: 'CA',
        zipCode: '94025',
        phone: '+1 555-0199',
        paymentMethod: 'Credit Card',
        paymentDetails: {
          cardNumber: '4111 2222 3333 4444',
          cardExpiry: '12/28',
          cardCvv: '789'
        },
        promoCode: 'ENCODERX10'
      })
    });

    const checkoutData = await checkoutRes.json();
    assert.strictEqual(checkoutRes.status, 201, 'Checkout should return 201 Created');
    assert.ok(checkoutData.order.orderNumber, 'Order should have orderNumber');
    assert.ok(checkoutData.order.discount > 0, 'ENCODERX10 promo discount should be applied');
    console.log(`✅ Order placed successfully: ${checkoutData.order.orderNumber}, Total: $${checkoutData.order.totalPrice}`);

    // Verify inventory deduction in database
    const p1ResAfter = await fetch(`${BASE_URL}/products/${targetId}`);
    const p1DataAfter = await p1ResAfter.json();
    const newStock = p1DataAfter.product.stock_count;
    assert.strictEqual(newStock, initialStock - 2, 'Stock must be decremented by exactly ordered quantity');
    console.log(`✅ Inventory deduction verified: Stock updated from ${initialStock} -> ${newStock}`);

    // Attempt checkout exceeding available stock -> Expect 400 failure
    const oversellRes = await fetch(`${BASE_URL}/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: targetId, quantity: 99999 }],
        customerName: 'Test Buyer',
        customerEmail: 'buyer@test.com',
        shippingAddress: '123 Street',
        city: 'City',
        state: 'ST',
        zipCode: '12345',
        paymentMethod: 'Credit Card',
        paymentDetails: {
          cardNumber: '4111 2222 3333 4444',
          cardExpiry: '12/28',
          cardCvv: '123'
        }
      })
    });
    const oversellData = await oversellRes.json();
    assert.strictEqual(oversellRes.status, 400, 'Overselling must be rejected with 400');
    assert.ok(oversellData.error.includes('Insufficient stock'), 'Error message must specify insufficient stock');
    console.log('✅ Oversell protection verified: Checkout blocked for insufficient inventory');

    // ==========================================
    // TEST 4: Admin Product CRUD & Order Status
    // ==========================================
    console.log('\n--- 4. Testing Admin Product CRUD & Order Status Management ---');

    // Create Product
    const newProdRes = await fetch(`${BASE_URL}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'EncoderX Dev Hoodie Pro',
        description: 'Premium heavyweight cotton fleece with embroidered tech badge.',
        price: 85.00,
        image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80',
        category: 'Apparel',
        stock_count: 50,
        rating: 4.9
      })
    });
    const newProdData = await newProdRes.json();
    assert.strictEqual(newProdRes.status, 201, 'Admin create product should return 201');
    const createdId = newProdData.product.id;
    console.log(`✅ Admin Product Created: ID ${createdId} - ${newProdData.product.name}`);

    // Update Product
    const updateProdRes = await fetch(`${BASE_URL}/admin/products/${createdId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        price: 75.00,
        stock_count: 42
      })
    });
    const updateProdData = await updateProdRes.json();
    assert.strictEqual(updateProdRes.status, 200, 'Admin update product should return 200');
    assert.strictEqual(updateProdData.product.price, 75.00);
    assert.strictEqual(updateProdData.product.stock_count, 42);
    console.log('✅ Admin Product Updated: Price -> $75.00, Stock -> 42');

    // Delete Product
    const deleteProdRes = await fetch(`${BASE_URL}/admin/products/${createdId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(deleteProdRes.status, 200, 'Admin delete product should return 200');
    console.log('✅ Admin Product Deleted successfully');

    // Verify deleted product is not in catalog
    const checkDeletedRes = await fetch(`${BASE_URL}/products/${createdId}`);
    assert.strictEqual(checkDeletedRes.status, 404, 'Deleted product should return 404');
    console.log('✅ Deletion verified: Product not found in catalog (404)');

    // Fetch admin orders dynamically
    const adminOrdersRes = await fetch(`${BASE_URL}/admin/orders`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminOrdersData = await adminOrdersRes.json();
    assert.ok(adminOrdersData.orders.length > 0, 'Admin orders must return list of orders');
    const targetOrderId = adminOrdersData.orders[0].id;

    // Update Order Status
    const updateOrderRes = await fetch(`${BASE_URL}/admin/orders/${targetOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Shipped' })
    });
    const updateOrderData = await updateOrderRes.json();
    assert.strictEqual(updateOrderRes.status, 200, 'Order status update should return 200');
    console.log(`✅ Admin Order #${targetOrderId} Status updated to "Shipped"`);

    console.log('\n🎉 ALL BACKEND & DATABASE TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  }
}

runTests().catch(async err => {
  console.error('\n❌ TEST FAILED:', err);
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  process.exit(1);
});
