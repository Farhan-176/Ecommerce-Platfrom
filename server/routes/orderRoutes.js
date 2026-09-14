const express = require('express');
const { get, query, transaction } = require('../db/database');
const { optionalToken, authenticateToken } = require('../middleware/auth');
const { generateInvoicePdf } = require('../services/invoiceService');

const router = express.Router();

// Tax rate: 8%
const TAX_RATE = 0.08;
// Free shipping over $150, otherwise $15
const FREE_SHIPPING_THRESHOLD = 150;
const STANDARD_SHIPPING_FEE = 15.00;

// Valid Promo Codes
const PROMO_CODES = {
  'ENCODERX10': 0.10, // 10% off subtotal
  'LAUNCH20': 0.20,   // 20% off subtotal
  'FREESHIP': 'FREE_SHIPPING'
};

// Process Checkout with Atomic Inventory Deduction
router.post('/checkout', optionalToken, (req, res) => {
  try {
    const {
      items,
      customerName,
      customerEmail,
      shippingAddress,
      city,
      state,
      zipCode,
      phone = '',
      paymentMethod = 'Credit Card',
      paymentDetails = {},
      promoCode = ''
    } = req.body;

    // Validate customer & shipping details
    if (!customerName || !customerEmail || !shippingAddress || !city || !state || !zipCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required shipping information. Please fill all address fields.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    // Validate cart items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Your shopping cart is empty.'
      });
    }

    for (const item of items) {
      if (!Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100000) {
        return res.status(400).json({
          success: false,
          error: 'Each cart item must include a product ID and an integer quantity from 1 to 100000.'
        });
      }
    }

    // Validate placeholder payment if card
    if (paymentMethod === 'Credit Card') {
      const { cardNumber, cardExpiry, cardCvv } = paymentDetails;
      if (!cardNumber || !cardExpiry || !cardCvv) {
        return res.status(400).json({
          success: false,
          error: 'Please complete all payment card details.'
        });
      }
      const cleanCard = cardNumber.replace(/[\s-]/g, '');
      if (!/^\d{13,19}$/.test(cleanCard)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid 13-19 digit card number.'
        });
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry) || !/^\d{3,4}$/.test(cardCvv)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid expiry date and 3-4 digit security code.'
        });
      }
      const [expiryMonth, expiryYear] = cardExpiry.split('/').map(Number);
      const expiryDate = new Date(2000 + expiryYear, expiryMonth, 0);
      if (expiryMonth < 1 || expiryMonth > 12 || expiryDate < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'The payment card expiry date must be valid and in the future.'
        });
      }
    }

    // ATOMIC TRANSACTION: Check stock, deduct inventory, and record order
    const orderResult = transaction(tx => {
      let subtotal = 0;
      const orderItemsToInsert = [];

      for (const item of items) {
        const product = tx.get('SELECT * FROM products WHERE id = ?', [item.productId]);

        if (!product) {
          throw new Error(`Product ID ${item.productId} was not found in catalog.`);
        }

        const qty = parseInt(item.quantity, 10);
        if (product.stock_count < qty) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${product.stock_count}, Requested: ${qty}.`
          );
        }

        const itemSubtotal = parseFloat((product.price * qty).toFixed(2));
        subtotal += itemSubtotal;

        // Deduct inventory stock
        tx.run(
          'UPDATE products SET stock_count = stock_count - ? WHERE id = ?',
          [qty, product.id]
        );

        orderItemsToInsert.push({
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: qty,
          subtotal: itemSubtotal
        });
      }

      subtotal = parseFloat(subtotal.toFixed(2));

      // Calculate Shipping
      let shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;

      // Calculate Promo Discount
      let discount = 0;
      const cleanPromo = (promoCode || '').trim().toUpperCase();
      if (cleanPromo && PROMO_CODES[cleanPromo]) {
        if (PROMO_CODES[cleanPromo] === 'FREE_SHIPPING') {
          shippingFee = 0;
        } else {
          discount = parseFloat((subtotal * PROMO_CODES[cleanPromo]).toFixed(2));
        }
      }

      const taxableAmount = Math.max(0, subtotal - discount);
      const tax = parseFloat((taxableAmount * TAX_RATE).toFixed(2));
      const totalPrice = parseFloat((taxableAmount + tax + shippingFee).toFixed(2));

      // Generate unique human-readable Order Number
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const userId = req.user ? req.user.id : null;

      // Insert Order
      const insertOrder = tx.run(
        `INSERT INTO orders (
          order_number, user_id, customer_name, customer_email, shipping_address,
          city, state, zip_code, phone, subtotal, tax, shipping_fee, discount,
          total_price, payment_method, payment_status, order_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          userId,
          customerName.trim(),
          customerEmail.trim(),
          shippingAddress.trim(),
          city.trim(),
          state.trim(),
          zipCode.trim(),
          phone.trim(),
          subtotal,
          tax,
          shippingFee,
          discount,
          totalPrice,
          paymentMethod,
          'Paid',
          'Processing'
        ]
      );

      const orderId = insertOrder.lastInsertRowid;

      // Insert Order Items
      for (const item of orderItemsToInsert) {
        tx.run(
          `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.productName, item.unitPrice, item.quantity, item.subtotal]
        );
      }

      return {
        orderId,
        orderNumber,
        customerName,
        customerEmail,
        subtotal,
        tax,
        shippingFee,
        discount,
        totalPrice,
        items: orderItemsToInsert
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully! Thank you for your purchase.',
      order: orderResult
    });
  } catch (error) {
    console.error('Checkout processing error:', error.message);
    return res.status(400).json({
      success: false,
      error: error.message || 'Checkout failed due to processing error.'
    });
  }
});

// Get user orders (requires login)
router.get('/my-orders', authenticateToken, (req, res) => {
  try {
    const orders = query(
      `SELECT * FROM orders WHERE user_id = ? OR customer_email = ? ORDER BY created_at DESC`,
      [req.user.id, req.user.email]
    );

    const ordersWithItems = orders.map(order => {
      const items = query(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [order.id]
      );
      return { ...order, items };
    });

    return res.json({ success: true, orders: ordersWithItems });
  } catch (error) {
    console.error('Fetch my-orders error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve orders.' });
  }
});

// Track single order by orderNumber
router.get('/:orderNumber/invoice', authenticateToken, (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = get('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to access this invoice.' });
    }
    const items = query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    generateInvoicePdf({ ...order, items }, res);
  } catch (error) {
    console.error('Invoice generation error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, error: 'Failed to generate PDF invoice.' });
  }
});

router.get('/track/:orderNumber', authenticateToken, (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = get('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You are not authorized to view this order.' });
    }

    const items = query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    return res.json({ success: true, order: { ...order, items } });
  } catch (error) {
    console.error('Track order error:', error);
    return res.status(500).json({ success: false, error: 'Failed to track order.' });
  }
});

module.exports = router;
