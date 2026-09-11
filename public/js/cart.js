// ==========================================================================
// Shopping Cart Drawer & State Preservation Module
// ==========================================================================
import { state } from './state.js';
import { showToast } from './api.js';

export function initCart() {
  setupCartDrawerEvents();
  renderCart();

  // Re-render whenever cart state changes
  state.subscribe('cart_updated', () => {
    renderCart();
  });
}

function setupCartDrawerEvents() {
  const toggleBtn = document.getElementById('cart-toggle-btn');
  const closeBtn = document.getElementById('btn-close-cart');
  const backdrop = document.getElementById('cart-backdrop');
  const drawer = document.getElementById('cart-drawer');

  function openCart() {
    if (drawer && backdrop) {
      drawer.classList.add('open');
      backdrop.classList.add('open');
    }
  }

  function closeCart() {
    if (drawer && backdrop) {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
    }
  }

  if (toggleBtn) toggleBtn.addEventListener('click', openCart);
  if (closeBtn) closeBtn.addEventListener('click', closeCart);
  if (backdrop) backdrop.addEventListener('click', closeCart);

  // Promo Code Handler
  const applyPromoBtn = document.getElementById('btn-apply-promo');
  const promoInput = document.getElementById('promo-code-input');
  const promoStatusMsg = document.getElementById('promo-status-msg');

  if (applyPromoBtn && promoInput) {
    applyPromoBtn.addEventListener('click', () => {
      const code = promoInput.value.trim().toUpperCase();
      if (!code) {
        state.promo = { code: '', discountPercent: 0, freeShipping: false };
        if (promoStatusMsg) promoStatusMsg.style.display = 'none';
        renderCart();
        return;
      }

      if (code === 'ENCODERX10') {
        state.promo = { code: 'ENCODERX10', discountPercent: 0.10, freeShipping: false };
        showPromoMsg('10% discount applied to your order!', 'success');
        showToast('Coupon "ENCODERX10" applied: 10% OFF!', 'success');
      } else if (code === 'LAUNCH20') {
        state.promo = { code: 'LAUNCH20', discountPercent: 0.20, freeShipping: false };
        showPromoMsg('20% discount applied to your order!', 'success');
        showToast('Coupon "LAUNCH20" applied: 20% OFF!', 'success');
      } else if (code === 'FREESHIP') {
        state.promo = { code: 'FREESHIP', discountPercent: 0, freeShipping: true };
        showPromoMsg('Free shipping unlocked!', 'success');
        showToast('Coupon "FREESHIP" applied!', 'success');
      } else {
        showPromoMsg('Invalid promo code. Try "ENCODERX10"', 'error');
        showToast('Invalid promo code.', 'error');
      }

      renderCart();
    });
  }

  // Proceed to Checkout button
  const checkoutBtn = document.getElementById('btn-proceed-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (state.cart.length === 0) {
        showToast('Your cart is empty. Add items before checking out.', 'error');
        return;
      }
      closeCart();
      const checkoutModal = document.getElementById('checkout-modal');
      if (checkoutModal) {
        checkoutModal.classList.add('active');
        populateCheckoutSummary();
      }
    });
  }
}

function showPromoMsg(msg, type) {
  const el = document.getElementById('promo-status-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.color = type === 'success' ? 'var(--success)' : 'var(--danger)';
}

export function renderCart() {
  const itemsList = document.getElementById('cart-items-list');
  const cartBadge = document.getElementById('cart-badge');
  const drawerCount = document.getElementById('drawer-cart-count');
  const subtotalEl = document.getElementById('cart-subtotal');
  const discountLine = document.getElementById('discount-summary-line');
  const discountEl = document.getElementById('cart-discount');
  const taxEl = document.getElementById('cart-tax');
  const shippingEl = document.getElementById('cart-shipping');
  const totalEl = document.getElementById('cart-grand-total');
  const checkoutBtn = document.getElementById('btn-proceed-checkout');

  // Shipping Progress
  const meterText = document.getElementById('shipping-meter-text');
  const progressBar = document.getElementById('shipping-progress-bar');

  const totalCount = state.getCartCount();

  // Update Badge with bounce animation
  if (cartBadge) {
    cartBadge.textContent = totalCount;
    cartBadge.classList.add('bounce');
    setTimeout(() => cartBadge.classList.remove('bounce'), 400);
  }

  if (drawerCount) {
    drawerCount.textContent = `(${totalCount} ${totalCount === 1 ? 'item' : 'items'})`;
  }

  if (!itemsList) return;

  if (state.cart.length === 0) {
    itemsList.innerHTML = `
      <div class="empty-cart-view">
        <i class="fa-solid fa-cart-shopping empty-cart-icon"></i>
        <h4 style="font-size: 1.1rem; color: #fff; margin-bottom: 6px;">Your cart is empty</h4>
        <p style="font-size: 0.85rem;">Discover our high-tech catalog and add gear to your bag.</p>
      </div>
    `;

    if (subtotalEl) subtotalEl.textContent = '$0.00';
    if (taxEl) taxEl.textContent = '$0.00';
    if (shippingEl) shippingEl.textContent = '$0.00';
    if (totalEl) totalEl.textContent = '$0.00';
    if (discountLine) discountLine.style.display = 'none';
    if (progressBar) progressBar.style.width = '0%';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (checkoutBtn) checkoutBtn.disabled = false;

  // Render items
  itemsList.innerHTML = '';
  state.cart.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.id = `cart-item-${item.product.id}`;

    const maxStock = item.product.stock_count;

    itemEl.innerHTML = `
      <img src="${item.product.image_url}" alt="${item.product.name}" class="cart-item-img">
      <div class="cart-item-details">
        <div>
          <h4 class="cart-item-title">${item.product.name}</h4>
          <div class="cart-item-price">$${item.product.price.toFixed(2)}</div>
        </div>

        <div class="cart-qty-control">
          <button class="qty-btn btn-qty-minus" data-id="${item.product.id}" title="Decrease quantity">-</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn btn-qty-plus" data-id="${item.product.id}" title="Increase quantity" ${item.quantity >= maxStock ? 'disabled' : ''}>+</button>
          <span style="font-size: 0.75rem; color: var(--text-subtle); margin-left: 6px;">(max: ${maxStock})</span>
        </div>
      </div>
      <button class="cart-item-remove" data-id="${item.product.id}" title="Remove item">
        <i class="fa-regular fa-trash-can"></i>
      </button>
    `;

    // Quantity Decrement
    itemEl.querySelector('.btn-qty-minus').addEventListener('click', () => {
      state.updateQuantity(item.product.id, item.quantity - 1);
    });

    // Quantity Increment
    itemEl.querySelector('.btn-qty-plus').addEventListener('click', () => {
      if (item.quantity < maxStock) {
        state.updateQuantity(item.product.id, item.quantity + 1);
      } else {
        showToast(`Cannot add more. Only ${maxStock} units in stock.`, 'error');
      }
    });

    // Remove
    itemEl.querySelector('.cart-item-remove').addEventListener('click', () => {
      state.removeFromCart(item.product.id);
      showToast(`Removed "${item.product.name}" from cart.`, 'info');
    });

    itemsList.appendChild(itemEl);
  });

  // Calculate Totals
  const totals = state.getCartTotals();

  if (subtotalEl) subtotalEl.textContent = `$${totals.subtotal.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `$${totals.tax.toFixed(2)}`;
  if (shippingEl) {
    shippingEl.textContent = totals.shipping === 0 ? 'FREE' : `$${totals.shipping.toFixed(2)}`;
    shippingEl.style.color = totals.shipping === 0 ? 'var(--success)' : 'inherit';
  }
  if (totalEl) totalEl.textContent = `$${totals.grandTotal.toFixed(2)}`;

  // Discount
  if (totals.discount > 0 && discountLine && discountEl) {
    discountLine.style.display = 'flex';
    discountEl.textContent = `-$${totals.discount.toFixed(2)}`;
  } else if (discountLine) {
    discountLine.style.display = 'none';
  }

  // Free Shipping Threshold Progress ($150)
  if (meterText && progressBar) {
    if (totals.subtotal >= 150 || totals.shipping === 0) {
      meterText.innerHTML = '<strong style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> FREE Express Shipping Unlocked!</strong>';
      progressBar.style.width = '100%';
    } else {
      const remaining = (150 - totals.subtotal).toFixed(2);
      const percent = Math.min(100, Math.round((totals.subtotal / 150) * 100));
      meterText.innerHTML = `Add <strong>$${remaining}</strong> more to qualify for <strong>FREE Express Shipping</strong>!`;
      progressBar.style.width = `${percent}%`;
    }
  }
}

export function populateCheckoutSummary() {
  const container = document.getElementById('checkout-items-preview');
  const payableEl = document.getElementById('checkout-total-payable');
  if (!container) return;

  const totals = state.getCartTotals();

  container.innerHTML = state.cart.map(item => `
    <div class="checkout-item-preview">
      <span>${item.quantity}x ${item.product.name}</span>
      <span style="color: #fff; font-weight: 600;">$${(item.product.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join('');

  if (totals.discount > 0) {
    container.innerHTML += `
      <div class="checkout-item-preview" style="color: var(--success);">
        <span>Promo Discount (${state.promo.code})</span>
        <span>-$${totals.discount.toFixed(2)}</span>
      </div>
    `;
  }

  container.innerHTML += `
    <div class="checkout-item-preview" style="color: var(--text-muted); font-size: 0.8rem;">
      <span>Sales Tax (8%) + Shipping</span>
      <span>$${(totals.tax + totals.shipping).toFixed(2)}</span>
    </div>
  `;

  if (payableEl) {
    payableEl.textContent = `$${totals.grandTotal.toFixed(2)}`;
  }
}
