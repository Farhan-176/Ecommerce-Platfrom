// ==========================================================================
// API Client & UI Toast Notifications
// ==========================================================================
import { state } from './state.js';

const BASE_URL = '/api';

/**
 * Toast Notification System
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'fa-solid fa-circle-info';
  if (type === 'success') icon = 'fa-solid fa-circle-check';
  if (type === 'error') icon = 'fa-solid fa-circle-exclamation';

  toast.innerHTML = `
    <i class="${icon}" style="font-size: 1.1rem;"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Generic API Request Helper
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'An unexpected error occurred.');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

// --- Products API ---
export async function fetchProducts(params = {}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'all') query.set('category', params.category);
  if (params.search) query.set('search', params.search);
  if (params.sort) query.set('sort', params.sort);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.inStockOnly) query.set('inStockOnly', 'true');

  return request(`/products?${query.toString()}`);
}

export async function fetchCategories() {
  return request('/products/categories');
}

export async function fetchProductById(id) {
  return request(`/products/${id}`);
}

// --- Checkout API ---
export async function processCheckout(payload) {
  return request('/orders/checkout', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// --- Auth API ---
export async function loginUser(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function registerUser(name, email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
}

// --- Admin API ---
export async function fetchAdminStats() {
  return request('/admin/stats');
}

export async function fetchAdminOrders(status = 'all') {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  return request(`/admin/orders${query}`);
}

export async function updateOrderStatus(orderId, status) {
  return request(`/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function createAdminProduct(productData) {
  return request('/admin/products', {
    method: 'POST',
    body: JSON.stringify(productData)
  });
}

export async function updateAdminProduct(productId, productData) {
  return request(`/admin/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(productData)
  });
}

export async function deleteAdminProduct(productId) {
  return request(`/admin/products/${productId}`, {
    method: 'DELETE'
  });
}
