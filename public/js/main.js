// ==========================================================================
// Application Entry Point & Module Coordinator
// ==========================================================================
import { state } from './state.js';
import { initAuth } from './auth.js';
import { initCatalog } from './catalog.js';
import { initCart } from './cart.js';
import { initCheckout } from './checkout.js';
import { initAdmin, loadAdminDashboard } from './admin.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing EncoderX E-Commerce Platform...');

  // Initialize UI & Feature Modules
  initAuth();
  initCart();
  initCheckout();
  initAdmin();
  await initCatalog();

  // Brand Logo click resets to catalog home
  const brandLogo = document.getElementById('nav-brand-logo');
  if (brandLogo) {
    brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      state.setView('catalog');
      state.resetFilters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Handle Hash Routing (#admin)
  if (window.location.hash === '#admin') {
    if (state.isAdmin()) {
      state.setView('admin');
      loadAdminDashboard();
    }
  }

  console.log('✨ EncoderX E-Commerce Platform initialized successfully!');
});
