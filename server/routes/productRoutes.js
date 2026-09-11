const express = require('express');
const { query, get } = require('../db/database');

const router = express.Router();

// Get list of unique categories with product counts
router.get('/categories', (req, res) => {
  try {
    const categories = query(
      `SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY category ASC`
    );
    return res.json({ success: true, categories });
  } catch (error) {
    console.error('Fetch categories error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch categories.' });
  }
});

// Get paginated, filtered, and sorted products
router.get('/', (req, res) => {
  try {
    const {
      category,
      search,
      sort = 'newest',
      page = 1,
      limit = 8,
      inStockOnly = 'false'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 8));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [];
    const params = [];

    // Filter by Category
    if (category && category.toLowerCase() !== 'all') {
      whereClauses.push('LOWER(category) = LOWER(?)');
      params.push(category);
    }

    // Filter by Search Query
    if (search && search.trim().length > 0) {
      whereClauses.push('(LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    // Filter by In-Stock Only
    if (inStockOnly === 'true' || inStockOnly === true) {
      whereClauses.push('stock_count > 0');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total matching items
    const countSql = `SELECT COUNT(*) as total FROM products ${whereSql}`;
    const totalRow = get(countSql, params);
    const total = totalRow ? totalRow.total : 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Determine Sort Order
    let orderBySql = 'ORDER BY created_at DESC';
    switch (sort) {
      case 'price_asc':
        orderBySql = 'ORDER BY price ASC';
        break;
      case 'price_desc':
        orderBySql = 'ORDER BY price DESC';
        break;
      case 'name_asc':
        orderBySql = 'ORDER BY name ASC';
        break;
      case 'name_desc':
        orderBySql = 'ORDER BY name DESC';
        break;
      case 'rating':
        orderBySql = 'ORDER BY rating DESC';
        break;
      case 'stock_desc':
        orderBySql = 'ORDER BY stock_count DESC';
        break;
      case 'newest':
      default:
        orderBySql = 'ORDER BY id DESC';
        break;
    }

    // Fetch paginated products
    const dataSql = `SELECT * FROM products ${whereSql} ${orderBySql} LIMIT ? OFFSET ?`;
    const products = query(dataSql, [...params, limitNum, offset]);

    return res.json({
      success: true,
      products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch products.' });
  }
});

// Get single product details
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const product = get('SELECT * FROM products WHERE id = ?', [id]);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    return res.json({ success: true, product });
  } catch (error) {
    console.error('Fetch single product error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch product.' });
  }
});

module.exports = router;
