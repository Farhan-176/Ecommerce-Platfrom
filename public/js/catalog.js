// ==========================================================================
// Product Catalog & Filtering Module
// ==========================================================================
import { state } from './state.js';
import { fetchProducts, fetchCategories, showToast } from './api.js';

let searchDebounceTimer = null;

export async function initCatalog() {
  setupEventListeners();
  await loadCategories();
  await loadCatalog();

  // Listen for filter state changes
  state.subscribe('filters_changed', () => {
    loadCatalog();
  });
}

function setupEventListeners() {
  // Search Input with 350ms debounce
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (searchClear) searchClear.style.display = val ? 'block' : 'none';

      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        state.setFilter('search', val);
      }, 350);
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchClear.style.display = 'none';
      state.setFilter('search', '');
    });
  }

  // Sort Dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.setFilter('sort', e.target.value);
    });
  }

  // In-Stock Only Checkbox
  const inStockCheckbox = document.getElementById('in-stock-checkbox');
  if (inStockCheckbox) {
    inStockCheckbox.addEventListener('change', (e) => {
      state.setFilter('inStockOnly', e.target.checked);
    });
  }

  // Reset Filters button
  const resetBtn = document.getElementById('btn-reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (searchClear) searchClear.style.display = 'none';
      if (sortSelect) sortSelect.value = 'newest';
      if (inStockCheckbox) inStockCheckbox.checked = false;
      state.resetFilters();
    });
  }

  // Coupon Pill Copy
  const couponPill = document.getElementById('coupon-pill');
  if (couponPill) {
    couponPill.addEventListener('click', () => {
      navigator.clipboard.writeText('ENCODERX10');
      showToast('Promo code "ENCODERX10" copied to clipboard! (10% OFF)', 'success');
    });
  }
}

async function loadCategories() {
  const container = document.getElementById('category-pills');
  if (!container) return;

  try {
    const data = await fetchCategories();
    const categories = data.categories || [];

    // Keep 'All' button
    container.innerHTML = `
      <button class="pill-btn ${state.filters.category === 'all' ? 'active' : ''}" data-category="all">
        All Products
      </button>
    `;

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `pill-btn ${state.filters.category.toLowerCase() === cat.category.toLowerCase() ? 'active' : ''}`;
      btn.setAttribute('data-category', cat.category);
      btn.textContent = `${cat.category} (${cat.count})`;
      container.appendChild(btn);
    });

    // Delegate category pill click
    container.addEventListener('click', (e) => {
      const target = e.target.closest('.pill-btn');
      if (target) {
        container.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        const cat = target.getAttribute('data-category');
        state.setFilter('category', cat);
      }
    });
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

export async function loadCatalog() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  // Show skeleton or loading state
  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary); margin-bottom: 12px;"></i>
      <p>Loading curated hardware catalog...</p>
    </div>
  `;

  // Update filter indicator
  updateFilterIndicator();

  try {
    const data = await fetchProducts(state.filters);
    const { products, pagination } = data;

    if (!products || products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-box-open" style="font-size: 3rem; color: var(--text-subtle); margin-bottom: 16px;"></i>
          <h3 style="font-size: 1.3rem; color: #fff; margin-bottom: 8px;">No Products Found</h3>
          <p>We couldn't find any items matching your current filters.</p>
        </div>
      `;
      renderPagination({ total: 0, page: 1, limit: state.filters.limit, totalPages: 1 });
      return;
    }

    grid.innerHTML = '';
    products.forEach(product => {
      grid.appendChild(createProductCard(product));
    });

    renderPagination(pagination);
  } catch (error) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--danger);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 10px;"></i>
        <p>Failed to load catalog: ${error.message}</p>
      </div>
    `;
  }
}

function updateFilterIndicator() {
  const indicator = document.getElementById('filter-indicator');
  const keywordSpan = document.getElementById('filter-keyword');
  if (!indicator || !keywordSpan) return;

  const parts = [];
  if (state.filters.category && state.filters.category !== 'all') {
    parts.push(`Category: "${state.filters.category}"`);
  }
  if (state.filters.search) {
    parts.push(`Keyword: "${state.filters.search}"`);
  }
  if (state.filters.inStockOnly) {
    parts.push(`In Stock Only`);
  }

  if (parts.length > 0) {
    keywordSpan.textContent = parts.join(', ');
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
  }
}

function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.id = `product-card-${product.id}`;

  const isOutOfStock = product.stock_count === 0;
  const isLowStock = product.stock_count > 0 && product.stock_count <= 5;

  let stockClass = 'in-stock';
  let stockLabel = `In Stock (${product.stock_count})`;
  if (isOutOfStock) {
    stockClass = 'out-of-stock';
    stockLabel = 'Out of Stock';
  } else if (isLowStock) {
    stockClass = 'low-stock';
    stockLabel = `Low Stock (${product.stock_count} left)`;
  }

  card.innerHTML = `
    <div class="product-image-wrap" data-id="${product.id}">
      <img src="${product.image_url}" alt="${product.name}" class="product-image" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'">
      <span class="badge-category">${product.category}</span>
      <span class="badge-stock ${stockClass}">${stockLabel}</span>
    </div>

    <div class="product-content">
      <div class="product-rating">
        <i class="fa-solid fa-star"></i>
        <span>${product.rating ? product.rating.toFixed(1) : '4.8'}</span>
        <span style="color: var(--text-subtle); margin-left: 2px;">/ 5.0</span>
      </div>

      <h3 class="product-title" data-id="${product.id}">${product.name}</h3>
      <p class="product-desc">${product.description}</p>

      <div class="product-footer">
        <div class="product-price">$${product.price.toFixed(2)}</div>
        <button class="btn btn-primary btn-add-cart" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''} id="btn-add-cart-${product.id}">
          <i class="fa-solid fa-cart-plus"></i> ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  `;

  // Click card to open quick view modal
  card.querySelector('.product-image-wrap').addEventListener('click', () => openProductModal(product));
  card.querySelector('.product-title').addEventListener('click', () => openProductModal(product));

  // Add to Cart button
  const addBtn = card.querySelector('.btn-add-cart');
  if (addBtn && !isOutOfStock) {
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.addToCart(product, 1);
      showToast(`Added "${product.name}" to cart!`, 'success');

      // Visual feedback on button
      addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
      setTimeout(() => {
        addBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add to Cart';
      }, 1200);
    });
  }

  return card;
}

function renderPagination(pagination) {
  const info = document.getElementById('pagination-info');
  const pagesContainer = document.getElementById('pagination-pages');
  if (!info || !pagesContainer) return;

  const { total, page, limit, totalPages } = pagination;

  if (total === 0) {
    info.textContent = 'Showing 0 products';
    pagesContainer.innerHTML = '';
    return;
  }

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);
  info.innerHTML = `Showing <strong>${startItem}</strong> - <strong>${endItem}</strong> of <strong>${total}</strong> products (Page ${page} of ${totalPages})`;

  pagesContainer.innerHTML = '';

  // Previous Page Button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prevBtn.disabled = page <= 1;
  prevBtn.id = 'pagination-prev-btn';
  prevBtn.addEventListener('click', () => state.setFilter('page', page - 1));
  pagesContainer.appendChild(prevBtn);

  // Numbered Page Buttons
  for (let p = 1; p <= totalPages; p++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-btn ${p === page ? 'active' : ''}`;
    pageBtn.textContent = p;
    pageBtn.addEventListener('click', () => state.setFilter('page', p));
    pagesContainer.appendChild(pageBtn);
  }

  // Next Page Button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  nextBtn.disabled = page >= totalPages;
  nextBtn.id = 'pagination-next-btn';
  nextBtn.addEventListener('click', () => state.setFilter('page', page + 1));
  pagesContainer.appendChild(nextBtn);
}

function openProductModal(product) {
  const modal = document.getElementById('product-modal');
  if (!modal) return;

  document.getElementById('modal-product-title').textContent = product.name;
  document.getElementById('modal-product-img').src = product.image_url;
  document.getElementById('modal-product-cat').textContent = product.category;
  document.getElementById('modal-product-price').textContent = `$${product.price.toFixed(2)}`;
  document.getElementById('modal-product-desc').textContent = product.description;

  const isOutOfStock = product.stock_count === 0;
  const stockBadge = document.getElementById('modal-product-stock-badge');
  if (stockBadge) {
    stockBadge.className = `badge-stock ${isOutOfStock ? 'out-of-stock' : (product.stock_count <= 5 ? 'low-stock' : 'in-stock')}`;
    stockBadge.textContent = isOutOfStock ? 'Out of Stock' : `In Stock (${product.stock_count} units available)`;
  }

  const ratingEl = document.getElementById('modal-product-rating');
  if (ratingEl) {
    ratingEl.innerHTML = `<i class="fa-solid fa-star"></i> <span>${product.rating ? product.rating.toFixed(1) : '4.8'} / 5.0 Rating</span>`;
  }

  const addBtn = document.getElementById('modal-add-to-cart-btn');
  if (addBtn) {
    addBtn.disabled = isOutOfStock;
    addBtn.onclick = () => {
      state.addToCart(product, 1);
      showToast(`Added "${product.name}" to cart!`, 'success');
      modal.classList.remove('active');
    };
  }

  const closeBtn = document.getElementById('btn-close-product-modal');
  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.remove('active');
  }

  modal.classList.add('active');
}
