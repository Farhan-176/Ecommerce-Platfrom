const express = require('express');
const { get, query, run } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Guard all admin routes with authentication and admin role requirement
router.use(authenticateToken);
router.use(requireRole('admin'));

// Analytics and KPI Statistics
router.get('/stats', (req, res) => {
  try {
    const revenueRow = get(
      `SELECT COALESCE(SUM(total_price), 0) as totalRevenue FROM orders WHERE payment_status = 'Paid'`
    );
    const orderCountRow = get('SELECT COUNT(*) as totalOrders FROM orders');
    const productCountRow = get('SELECT COUNT(*) as totalProducts FROM products');
    const userCountRow = get(`SELECT COUNT(*) as totalCustomers FROM users WHERE role = 'customer'`);
    const lowStockRow = get('SELECT COUNT(*) as lowStockCount FROM products WHERE stock_count <= 5 AND stock_count > 0');
    const outOfStockRow = get('SELECT COUNT(*) as outOfStockCount FROM products WHERE stock_count = 0');

    // Revenue breakdown by category
    const categoryStats = query(`
      SELECT p.category, COALESCE(SUM(oi.subtotal), 0) as revenue, SUM(oi.quantity) as unitsSold
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.category
      ORDER BY revenue DESC
    `);

    // Top 5 selling products
    const topProducts = query(`
      SELECT p.id, p.name, p.category, p.price, p.image_url,
             COALESCE(SUM(oi.quantity), 0) as totalSold,
             COALESCE(SUM(oi.subtotal), 0) as totalRevenue
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY totalSold DESC
      LIMIT 5
    `);

    // Recent 5 orders
    const recentOrders = query(`
      SELECT id, order_number, customer_name, customer_email, total_price, order_status, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5
    `);

    return res.json({
      success: true,
      stats: {
        totalRevenue: parseFloat((revenueRow?.totalRevenue || 0).toFixed(2)),
        totalOrders: orderCountRow?.totalOrders || 0,
        totalProducts: productCountRow?.totalProducts || 0,
        totalCustomers: userCountRow?.totalCustomers || 0,
        lowStockCount: lowStockRow?.lowStockCount || 0,
        outOfStockCount: outOfStockRow?.outOfStockCount || 0,
        categoryStats,
        topProducts,
        recentOrders
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve administrative statistics.' });
  }
});

// Get all orders with full details
router.get('/orders', (req, res) => {
  try {
    const { status, search } = req.query;
    const whereClauses = [];
    const params = [];

    if (status && status !== 'all') {
      whereClauses.push('order_status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      whereClauses.push('(order_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const orders = query(`SELECT * FROM orders ${whereSql} ORDER BY created_at DESC`, params);

    const ordersWithItems = orders.map(order => {
      const items = query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      return { ...order, items };
    });

    return res.json({ success: true, orders: ordersWithItems });
  } catch (error) {
    console.error('Admin orders error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve orders.' });
  }
});

// Update order status
router.patch('/orders/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = get('SELECT id FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    run('UPDATE orders SET order_status = ? WHERE id = ?', [status, id]);

    return res.json({
      success: true,
      message: `Order #${id} status updated to ${status}.`
    });
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update order status.' });
  }
});

// Create product dynamically
router.post('/products', (req, res) => {
  try {
    const { name, description, price, image_url, category, stock_count, rating = 4.8 } = req.body;

    if (!name || !description || price === undefined || !image_url || !category || stock_count === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required product fields.'
      });
    }

    const numPrice = parseFloat(price);
    const numStock = parseInt(stock_count, 10);

    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, error: 'Price must be a valid positive number.' });
    }

    if (isNaN(numStock) || numStock < 0) {
      return res.status(400).json({ success: false, error: 'Stock count must be a valid non-negative integer.' });
    }

    const result = run(
      `INSERT INTO products (name, description, price, image_url, category, stock_count, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description.trim(), numPrice, image_url.trim(), category.trim(), numStock, parseFloat(rating) || 4.8]
    );

    const newProduct = get('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully!',
      product: newProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create product.' });
  }
});

// Update existing product
router.put('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, image_url, category, stock_count, rating } = req.body;

    const existing = get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedDesc = description !== undefined ? description.trim() : existing.description;
    const updatedPrice = price !== undefined ? parseFloat(price) : existing.price;
    const updatedImg = image_url !== undefined ? image_url.trim() : existing.image_url;
    const updatedCat = category !== undefined ? category.trim() : existing.category;
    const updatedStock = stock_count !== undefined ? parseInt(stock_count, 10) : existing.stock_count;
    const updatedRating = rating !== undefined ? parseFloat(rating) : existing.rating;

    if (isNaN(updatedPrice) || updatedPrice < 0) {
      return res.status(400).json({ success: false, error: 'Price must be positive.' });
    }
    if (isNaN(updatedStock) || updatedStock < 0) {
      return res.status(400).json({ success: false, error: 'Stock count must be non-negative.' });
    }

    run(
      `UPDATE products
       SET name = ?, description = ?, price = ?, image_url = ?, category = ?, stock_count = ?, rating = ?
       WHERE id = ?`,
      [updatedName, updatedDesc, updatedPrice, updatedImg, updatedCat, updatedStock, updatedRating, id]
    );

    const updatedProduct = get('SELECT * FROM products WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Product updated successfully!',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update product.' });
  }
});

// Delete product from catalog
router.delete('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    // If order items exist referencing this product, set product_id to NULL to preserve order history
    run('UPDATE order_items SET product_id = NULL WHERE product_id = ?', [id]);
    run('DELETE FROM products WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: `Product "${existing.name}" has been deleted from inventory.`
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete product.' });
  }
});

module.exports = router;
