// ==========================================================================
// Admin Dashboard & Inventory Management Module (RBAC Protected)
// ==========================================================================
import { state } from './state.js';
import {
  fetchAdminStats,
  fetchAdminOrders,
  updateOrderStatus,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  showToast
} from './api.js';
import { loadCatalog } from './catalog.js';
import { escapeHtml, safeImageUrl } from './sanitize.js';
import { formatCurrency } from './currency.js';

export function initAdmin() {
  setupAdminNavigation();
  setupProductCRUDModal();
}

function setupAdminNavigation() {
  const adminNavBtn = document.getElementById('btn-admin-nav');
  const exitAdminBtn = document.getElementById('btn-exit-admin');
  const tabProductsBtn = document.getElementById('tab-btn-products');
  const tabOrdersBtn = document.getElementById('tab-btn-orders');
  const tabProducts = document.getElementById('admin-tab-products');
  const tabOrders = document.getElementById('admin-tab-orders');
  const orderFilterStatus = document.getElementById('admin-order-filter-status');

  // Open Admin Dashboard
  if (adminNavBtn) {
    adminNavBtn.addEventListener('click', () => {
      if (!state.isAdmin()) {
        showToast('Access denied. Administrator privileges required.', 'error');
        return;
      }
      state.setView('admin');
      loadAdminDashboard();
    });
  }

  // Exit Admin Dashboard
  if (exitAdminBtn) {
    exitAdminBtn.addEventListener('click', () => {
      state.setView('catalog');
    });
  }

  // Admin View Switching
  state.subscribe('view_changed', (view) => {
    const catalogSection = document.getElementById('catalog-section');
    const adminSection = document.getElementById('admin-section');

    if (view === 'admin') {
      if (catalogSection) catalogSection.classList.add('hidden');
      if (adminSection) adminSection.classList.add('active');
    } else {
      if (catalogSection) catalogSection.classList.remove('hidden');
      if (adminSection) adminSection.classList.remove('active');
    }
  });

  // Tab switching: Products vs Orders
  if (tabProductsBtn && tabOrdersBtn && tabProducts && tabOrders) {
    tabProductsBtn.addEventListener('click', () => {
      tabProductsBtn.classList.add('active');
      tabOrdersBtn.classList.remove('active');
      tabProducts.style.display = 'block';
      tabOrders.style.display = 'none';
    });

    tabOrdersBtn.addEventListener('click', () => {
      tabOrdersBtn.classList.add('active');
      tabProductsBtn.classList.remove('active');
      tabOrders.style.display = 'block';
      tabProducts.style.display = 'none';
      loadAdminOrders();
    });
  }

  // Order status filter dropdown
  if (orderFilterStatus) {
    orderFilterStatus.addEventListener('change', () => {
      loadAdminOrders(orderFilterStatus.value);
    });
  }
}

export async function loadAdminDashboard() {
  if (!state.isAdmin()) return;

  try {
    const data = await fetchAdminStats();
    const { stats } = data;

    // Update KPI Tiles
    document.getElementById('kpi-revenue').textContent = formatCurrency(stats.totalRevenue);
    document.getElementById('kpi-orders').textContent = stats.totalOrders;
    document.getElementById('kpi-products').textContent = stats.totalProducts;
    document.getElementById('kpi-alerts').textContent = stats.lowStockCount + stats.outOfStockCount;

    // Load Products table
    await loadAdminProducts();
  } catch (error) {
    console.error('Failed to load admin stats:', error);
    showToast(error.message, 'error');
  }
}

async function loadAdminProducts() {
  const tbody = document.getElementById('admin-products-tbody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Loading inventory...
      </td>
    </tr>
  `;

  try {
    // Fetch all products (limit 100 for admin overview)
    const response = await fetch('/api/products?limit=100');
    const data = await response.json();
    const products = data.products || [];

    tbody.innerHTML = '';

    products.forEach(p => {
      const tr = document.createElement('tr');
      tr.id = `admin-prod-row-${p.id}`;

      let stockBadgeClass = 'in-stock';
      if (p.stock_count === 0) stockBadgeClass = 'out-of-stock';
      else if (p.stock_count <= 5) stockBadgeClass = 'low-stock';

      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${safeImageUrl(p.image_url)}" alt="${escapeHtml(p.name)}" class="table-img">
            <div>
              <div style="font-weight: 600; color: #fff;">${escapeHtml(p.name)}</div>
              <div style="font-size: 0.75rem; color: var(--text-subtle);">ID: #${p.id}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-category" style="position: static;">${escapeHtml(p.category)}</span></td>
        <td style="font-weight: 700; color: #93c5fd;">${formatCurrency(p.price)}</td>
        <td><span class="badge-stock ${stockBadgeClass}" style="position: static;">${p.stock_count} units</span></td>
        <td><i class="fa-solid fa-star" style="color: #f59e0b; font-size: 0.8rem;"></i> ${p.rating ? p.rating.toFixed(1) : '4.8'}</td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-edit-prod" data-id="${p.id}" title="Edit product" style="padding: 6px 10px; font-size: 0.8rem;">
              <i class="fa-regular fa-pen-to-square"></i> Edit
            </button>
            <button class="btn btn-danger btn-delete-prod" data-id="${p.id}" title="Delete product" style="padding: 6px 10px; font-size: 0.8rem;">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;

      // Edit Button
      tr.querySelector('.btn-edit-prod').addEventListener('click', () => openEditProductModal(p));

      // Delete Button
      tr.querySelector('.btn-delete-prod').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${p.name}" from the catalog?`)) {
          try {
            await deleteAdminProduct(p.id);
            showToast(`Product "${p.name}" deleted from catalog.`, 'success');
            loadAdminDashboard();
            loadCatalog();
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });

      tbody.appendChild(tr);
    });
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="color: var(--danger); text-align: center;">Failed to load products: ${error.message}</td></tr>`;
  }
}

async function loadAdminOrders(status = 'all') {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Loading order records...
      </td>
    </tr>
  `;

  try {
    const data = await fetchAdminOrders(status);
    const orders = data.orders || [];

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    orders.forEach(order => {
      const tr = document.createElement('tr');
      const itemsCount = order.items ? order.items.reduce((sum, i) => sum + i.quantity, 0) : 0;
      const orderDate = new Date(order.created_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
      });

      tr.innerHTML = `
        <td style="font-family: monospace; font-weight: 700; color: var(--secondary);">${order.order_number}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(order.customer_name)}</div>
          <div style="font-size: 0.75rem; color: var(--text-subtle);">${escapeHtml(order.customer_email)}</div>
        </td>
        <td>${orderDate}</td>
        <td>${itemsCount} items</td>
        <td style="font-weight: 700; color: #fff;">${formatCurrency(order.total_price)}</td>
        <td><span class="status-badge ${order.order_status}">${order.order_status}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <select class="status-select" data-id="${order.id}">
              <option value="Processing" ${order.order_status === 'Processing' ? 'selected' : ''}>Processing</option>
              <option value="Shipped" ${order.order_status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${order.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${order.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <a href="/api/orders/${order.order_number}/invoice" target="_blank" class="btn btn-secondary" style="padding: 5px 8px; font-size: 0.75rem; text-decoration: none;" title="Download PDF Invoice">
              <i class="fa-solid fa-file-pdf" style="color: #ef4444;"></i>
            </a>
          </div>
        </td>
      `;

      // Status change listener
      const select = tr.querySelector('.status-select');
      select.addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        try {
          await updateOrderStatus(order.id, newStatus);
          showToast(`Order ${order.order_number} updated to "${newStatus}"`, 'success');
          loadAdminDashboard();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });

      tbody.appendChild(tr);
    });
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--danger); text-align: center;">Failed to load orders: ${error.message}</td></tr>`;
  }
}

// Product Create / Edit Modal Setup
function setupProductCRUDModal() {
  const modal = document.getElementById('admin-product-modal');
  const openCreateBtn = document.getElementById('btn-create-product-modal');
  const closeBtn = document.getElementById('btn-close-admin-product-modal');
  const cancelBtn = document.getElementById('btn-cancel-admin-prod');
  const form = document.getElementById('admin-product-form');

  const sampleTechBtn = document.getElementById('btn-sample-img-tech');
  const sampleAudioBtn = document.getElementById('btn-sample-img-audio');

  function openModal() {
    if (modal) modal.classList.add('active');
  }

  function closeModal() {
    if (modal) {
      modal.classList.remove('active');
      if (form) form.reset();
      document.getElementById('admin-prod-id').value = '';
    }
  }

  if (openCreateBtn) {
    openCreateBtn.addEventListener('click', () => {
      document.getElementById('admin-product-modal-title').textContent = 'Create New Catalog Product';
      document.getElementById('admin-prod-id').value = '';
      if (form) form.reset();
      openModal();
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // Sample image autofill buttons
  if (sampleTechBtn) {
    sampleTechBtn.addEventListener('click', () => {
      document.getElementById('admin-prod-image').value = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80';
    });
  }

  if (sampleAudioBtn) {
    sampleAudioBtn.addEventListener('click', () => {
      document.getElementById('admin-prod-image').value = 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80';
    });
  }

  // Handle Form Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const prodId = document.getElementById('admin-prod-id').value;
      const name = document.getElementById('admin-prod-name').value.trim();
      const category = document.getElementById('admin-prod-category').value.trim();
      const price = parseFloat(document.getElementById('admin-prod-price').value);
      const stock_count = parseInt(document.getElementById('admin-prod-stock').value, 10);
      const rating = parseFloat(document.getElementById('admin-prod-rating').value) || 4.8;
      const image_url = document.getElementById('admin-prod-image').value.trim();
      const description = document.getElementById('admin-prod-desc').value.trim();

      const errorMsg = document.getElementById('admin-prod-error-msg');
      if (errorMsg) errorMsg.style.display = 'none';

      const payload = {
        name,
        category,
        price,
        stock_count,
        rating,
        image_url,
        description
      };

      try {
        if (prodId) {
          // Update
          await updateAdminProduct(prodId, payload);
          showToast(`Product "${name}" updated successfully!`, 'success');
        } else {
          // Create
          await createAdminProduct(payload);
          showToast(`New product "${name}" added to catalog!`, 'success');
        }

        closeModal();
        loadAdminDashboard();
        loadCatalog();
      } catch (err) {
        if (errorMsg) {
          errorMsg.textContent = err.message || 'Operation failed.';
          errorMsg.style.display = 'block';
        }
      }
    });
  }
}

function openEditProductModal(product) {
  const modal = document.getElementById('admin-product-modal');
  if (!modal) return;

  document.getElementById('admin-product-modal-title').textContent = `Edit Product #${product.id}`;
  document.getElementById('admin-prod-id').value = product.id;
  document.getElementById('admin-prod-name').value = product.name;
  document.getElementById('admin-prod-category').value = product.category;
  document.getElementById('admin-prod-price').value = product.price;
  document.getElementById('admin-prod-stock').value = product.stock_count;
  document.getElementById('admin-prod-rating').value = product.rating || 4.8;
  document.getElementById('admin-prod-image').value = product.image_url;
  document.getElementById('admin-prod-desc').value = product.description;

  modal.classList.add('active');
}
