// ==========================================================================
// Global Application State Manager with LocalStorage Persistence
// ==========================================================================

class StateManager {
  constructor() {
    this.subscribers = {};

    // Restore Auth
    this.token = localStorage.getItem('encoderx_token') || null;
    this.user = null;
    try {
      const savedUser = localStorage.getItem('encoderx_user');
      if (savedUser) this.user = JSON.parse(savedUser);
    } catch (e) {
      this.user = null;
    }

    // Restore Cart
    this.cart = [];
    try {
      const savedCart = localStorage.getItem('encoderx_cart');
      if (savedCart) this.cart = JSON.parse(savedCart);
    } catch (e) {
      this.cart = [];
    }

    // Filters & Pagination
    this.filters = {
      category: 'all',
      search: '',
      sort: 'newest',
      inStockOnly: false,
      page: 1,
      limit: 8
    };

    // Promo Code
    this.promo = {
      code: '',
      discountPercent: 0,
      freeShipping: false
    };

    // Active View: 'catalog' | 'admin'
    this.activeView = 'catalog';
  }

  subscribe(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
    return () => {
      this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
    };
  }

  notify(event, data) {
    if (this.subscribers[event]) {
      this.subscribers[event].forEach(cb => cb(data));
    }
  }

  // --- Auth State ---
  setUser(user, token) {
    this.user = user;
    this.token = token;
    if (token) {
      localStorage.setItem('encoderx_token', token);
      localStorage.setItem('encoderx_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('encoderx_token');
      localStorage.removeItem('encoderx_user');
    }
    this.notify('auth_changed', { user: this.user, token: this.token });
  }

  logout() {
    this.setUser(null, null);
    this.activeView = 'catalog';
    this.notify('view_changed', 'catalog');
  }

  isAdmin() {
    return this.user && this.user.role === 'admin';
  }

  // --- Cart State ---
  saveCart() {
    localStorage.setItem('encoderx_cart', JSON.stringify(this.cart));
    this.notify('cart_updated', this.cart);
  }

  addToCart(product, quantity = 1) {
    const existingIndex = this.cart.findIndex(item => item.product.id === product.id);

    if (existingIndex > -1) {
      const newQty = this.cart[existingIndex].quantity + quantity;
      // Cap at available stock
      if (newQty > product.stock_count) {
        this.cart[existingIndex].quantity = product.stock_count;
      } else {
        this.cart[existingIndex].quantity = newQty;
      }
    } else {
      const qtyToAdd = Math.min(quantity, product.stock_count);
      if (qtyToAdd > 0) {
        this.cart.push({
          product,
          quantity: qtyToAdd
        });
      }
    }

    this.saveCart();
  }

  updateQuantity(productId, quantity) {
    const item = this.cart.find(item => item.product.id === productId);
    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(productId);
      } else {
        item.quantity = Math.min(quantity, item.product.stock_count);
        this.saveCart();
      }
    }
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.product.id !== productId);
    this.saveCart();
  }

  clearCart() {
    this.cart = [];
    this.promo = { code: '', discountPercent: 0, freeShipping: false };
    this.saveCart();
  }

  getCartCount() {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  getCartTotals() {
    const subtotal = this.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const roundedSubtotal = parseFloat(subtotal.toFixed(2));

    let shipping = (roundedSubtotal >= 150 || roundedSubtotal === 0 || this.promo.freeShipping) ? 0 : 15.00;
    let discount = 0;

    if (this.promo.discountPercent > 0) {
      discount = parseFloat((roundedSubtotal * this.promo.discountPercent).toFixed(2));
    }

    const taxableAmount = Math.max(0, roundedSubtotal - discount);
    const tax = parseFloat((taxableAmount * 0.08).toFixed(2));
    const grandTotal = parseFloat((taxableAmount + tax + shipping).toFixed(2));

    return {
      subtotal: roundedSubtotal,
      discount,
      shipping,
      tax,
      grandTotal
    };
  }

  // --- Filter State ---
  setFilter(key, value) {
    this.filters[key] = value;
    if (key !== 'page') {
      this.filters.page = 1; // Reset to page 1 on filter change
    }
    this.notify('filters_changed', this.filters);
  }

  resetFilters() {
    this.filters = {
      category: 'all',
      search: '',
      sort: 'newest',
      inStockOnly: false,
      page: 1,
      limit: 8
    };
    this.notify('filters_changed', this.filters);
  }

  // --- View State ---
  setView(view) {
    this.activeView = view;
    this.notify('view_changed', view);
  }
}

export const state = new StateManager();
