// ==========================================================================
// Checkout Processing & Order Confirmation Module
// ==========================================================================
import { state } from './state.js';
import { processCheckout, showToast } from './api.js';
import { loadCatalog } from './catalog.js';

export function initCheckout() {
  const modal = document.getElementById('checkout-modal');
  const closeBtn = document.getElementById('btn-close-checkout');
  const form = document.getElementById('checkout-form');
  const cardInput = document.getElementById('card-number');
  const expiryInput = document.getElementById('card-expiry');
  const confirmModal = document.getElementById('confirmation-modal');
  const continueBtn = document.getElementById('btn-continue-shopping');

  // Close Checkout Modal
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  // Pre-fill user data if logged in
  state.subscribe('auth_changed', ({ user }) => {
    if (user) {
      const nameEl = document.getElementById('ship-name');
      const emailEl = document.getElementById('ship-email');
      if (nameEl && !nameEl.value) nameEl.value = user.name || '';
      if (emailEl && !emailEl.value) emailEl.value = user.email || '';
    }
  });

  // Card Number Formatting (XXXX XXXX XXXX XXXX)
  if (cardInput) {
    cardInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
      e.target.value = formatted.substring(0, 19);
    });
  }

  // Card Expiry Formatting (MM/YY)
  if (expiryInput) {
    expiryInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
      } else {
        e.target.value = value;
      }
    });
  }

  // Handle Checkout Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const errorMsg = document.getElementById('checkout-error-msg');
      const submitBtn = document.getElementById('btn-submit-order');
      if (errorMsg) errorMsg.style.display = 'none';

      if (state.cart.length === 0) {
        showToast('Your shopping cart is empty.', 'error');
        return;
      }

      // Collect inputs
      const customerName = document.getElementById('ship-name').value.trim();
      const customerEmail = document.getElementById('ship-email').value.trim();
      const shippingAddress = document.getElementById('ship-address').value.trim();
      const city = document.getElementById('ship-city').value.trim();
      const stateVal = document.getElementById('ship-state').value.trim();
      const zipCode = document.getElementById('ship-zip').value.trim();
      const phone = document.getElementById('ship-phone').value.trim();

      const cardNumber = document.getElementById('card-number').value.trim();
      const cardExpiry = document.getElementById('card-expiry').value.trim();
      const cardCvv = document.getElementById('card-cvv').value.trim();

      const items = state.cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }));

      // Button loading state
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Transaction...';

      try {
        const response = await processCheckout({
          items,
          customerName,
          customerEmail,
          shippingAddress,
          city,
          state: stateVal,
          zipCode,
          phone,
          paymentMethod: 'Credit Card',
          paymentDetails: {
            cardNumber,
            cardExpiry,
            cardCvv
          },
          promoCode: state.promo.code
        });

        // SUCCESS!
        showToast('Payment Authorized! Order Placed Successfully.', 'success');

        // Clear cart
        state.clearCart();

        // Refresh product catalog to show updated stock levels
        loadCatalog();

        // Close Checkout Modal
        if (modal) modal.classList.remove('active');

        // Show Confirmation Modal
        if (confirmModal) {
          document.getElementById('confirm-customer-name').textContent = response.order.customerName;
          document.getElementById('confirm-order-number').textContent = response.order.orderNumber;
          document.getElementById('confirm-total-price').textContent = `$${response.order.totalPrice.toFixed(2)}`;
          confirmModal.classList.add('active');
        }
      } catch (err) {
        if (errorMsg) {
          errorMsg.textContent = err.message || 'Checkout failed. Please check your inventory or payment details.';
          errorMsg.style.display = 'block';
        }
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Continue Shopping from Confirmation Modal
  if (continueBtn && confirmModal) {
    continueBtn.addEventListener('click', () => {
      confirmModal.classList.remove('active');
    });
  }
}
