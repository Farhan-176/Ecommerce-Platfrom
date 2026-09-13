// ==========================================================================
// Customer Order History & PDF Invoice Management Module
// ==========================================================================
import { state } from './state.js';
import { showToast } from './api.js';

export function initOrders() {
  const myOrdersBtn = document.getElementById('btn-my-orders');
  const modal = document.getElementById('my-orders-modal');
  const closeBtn = document.getElementById('btn-close-my-orders');

  if (myOrdersBtn) {
    myOrdersBtn.addEventListener('click', () => {
      if (!state.user) {
        showToast('Please sign in to view your order history.', 'info');
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.add('active');
        return;
      }
      openMyOrdersModal();
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }
}

export async function openMyOrdersModal() {
  const modal = document.getElementById('my-orders-modal');
  const container = document.getElementById('my-orders-list');
  if (!modal || !container) return;

  modal.classList.add('active');
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: var(--primary); margin-bottom: 12px;"></i>
      <p>Loading your past orders...</p>
    </div>
  `;

  try {
    const headers = {};
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const res = await fetch('/api/orders/my-orders', { headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to retrieve orders.');
    }

    const orders = data.orders || [];

    if (orders.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-box-open" style="font-size: 3rem; color: var(--text-subtle); margin-bottom: 14px;"></i>
          <h4 style="color: #fff; font-size: 1.1rem; margin-bottom: 6px;">No Orders Yet</h4>
          <p style="font-size: 0.85rem;">You haven't placed any orders yet. Discover our tech catalog!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    orders.forEach(order => {
      const orderCard = document.createElement('div');
      orderCard.className = 'my-order-card';
      orderCard.style.cssText = `
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 18px;
        margin-bottom: 16px;
      `;

      const orderDate = new Date(order.created_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const itemsHtml = (order.items || []).map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.04);">
          <span style="color: #e2e8f0;">
            <strong style="color: var(--primary);">${item.quantity}x</strong> ${item.product_name}
          </span>
          <span style="font-weight: 600; color: #94a3b8;">$${Number(item.subtotal).toFixed(2)}</span>
        </div>
      `).join('');

      orderCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 700; color: #fff;">
              Order <span style="color: var(--secondary);">${order.order_number}</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-subtle);">${orderDate}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="status-badge ${order.order_status}">${order.order_status}</span>
            <a href="/api/orders/${order.order_number}/invoice" target="_blank" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.78rem; text-decoration: none;">
              <i class="fa-solid fa-file-pdf" style="color: #ef4444;"></i> PDF Invoice
            </a>
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.2); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 12px;">
          ${itemsHtml}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
          <span style="color: var(--text-muted);">Total Paid:</span>
          <strong style="font-size: 1.15rem; color: var(--success);">$${Number(order.total_price).toFixed(2)}</strong>
        </div>
      `;

      container.appendChild(orderCard);
    });
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--danger); padding: 24px;">
        <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; margin-bottom: 8px;"></i>
        <p>Error loading orders: ${err.message}</p>
      </div>
    `;
  }
}
