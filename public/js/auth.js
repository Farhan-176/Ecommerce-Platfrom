// ==========================================================================
// Authentication & Role-Based Access Control (RBAC) Module
// ==========================================================================
import { state } from './state.js';
import { loginUser, registerUser, showToast } from './api.js';

export function initAuth() {
  setupAuthModal();
  updateAuthUI();

  state.subscribe('auth_changed', () => {
    updateAuthUI();
  });
}

function setupAuthModal() {
  const modal = document.getElementById('auth-modal');
  const openBtn = document.getElementById('btn-auth-open');
  const closeBtn = document.getElementById('btn-close-auth');
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  const demoAdminBtn = document.getElementById('btn-demo-admin');
  const demoCustomerBtn = document.getElementById('btn-demo-customer');

  // Open Modal or Logout
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (state.user) {
        if (confirm(`Logged in as ${state.user.name} (${state.user.role}). Do you want to sign out?`)) {
          state.logout();
          showToast('Signed out successfully.', 'info');
        }
      } else {
        if (modal) modal.classList.add('active');
      }
    });
  }

  // Close Modal
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  // Tab Switcher
  if (tabLoginBtn && tabRegisterBtn && loginForm && registerForm) {
    tabLoginBtn.addEventListener('click', () => {
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      document.getElementById('auth-modal-title').textContent = 'Sign In to Your Account';
    });

    tabRegisterBtn.addEventListener('click', () => {
      tabRegisterBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      registerForm.style.display = 'block';
      loginForm.style.display = 'none';
      document.getElementById('auth-modal-title').textContent = 'Create Customer Account';
    });
  }

  // Login Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorMsg = document.getElementById('login-error-msg');

      if (errorMsg) errorMsg.style.display = 'none';

      try {
        const response = await loginUser(email, password);
        state.setUser(response.user, response.token);
        showToast(response.message || `Welcome, ${response.user.name}!`, 'success');
        if (modal) modal.classList.remove('active');
      } catch (err) {
        if (errorMsg) {
          errorMsg.textContent = err.message || 'Login failed.';
          errorMsg.style.display = 'block';
        }
      }
    });
  }

  // Register Submit
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const errorMsg = document.getElementById('reg-error-msg');

      if (errorMsg) errorMsg.style.display = 'none';

      try {
        const response = await registerUser(name, email, password);
        state.setUser(response.user, response.token);
        showToast('Account registered successfully! Welcome aboard.', 'success');
        if (modal) modal.classList.remove('active');
      } catch (err) {
        if (errorMsg) {
          errorMsg.textContent = err.message || 'Registration failed.';
          errorMsg.style.display = 'block';
        }
      }
    });
  }

  // Quick 1-Click Demo Logins
  if (demoAdminBtn) {
    demoAdminBtn.addEventListener('click', async () => {
      document.getElementById('login-email').value = 'admin@store.com';
      document.getElementById('login-password').value = 'admin123';
      try {
        const res = await loginUser('admin@store.com', 'admin123');
        state.setUser(res.user, res.token);
        showToast('Logged in as Store Administrator!', 'success');
        if (modal) modal.classList.remove('active');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  if (demoCustomerBtn) {
    demoCustomerBtn.addEventListener('click', async () => {
      document.getElementById('login-email').value = 'customer@store.com';
      document.getElementById('login-password').value = 'customer123';
      try {
        const res = await loginUser('customer@store.com', 'customer123');
        state.setUser(res.user, res.token);
        showToast(`Logged in as Customer (${res.user.name})!`, 'success');
        if (modal) modal.classList.remove('active');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

export function updateAuthUI() {
  const authLabel = document.getElementById('auth-btn-label');
  const adminNavBtn = document.getElementById('btn-admin-nav');

  if (state.user) {
    const roleBadge = state.user.role === 'admin' ? ' (Admin)' : '';
    if (authLabel) authLabel.textContent = `${state.user.name}${roleBadge}`;

    if (adminNavBtn) {
      adminNavBtn.style.display = state.user.role === 'admin' ? 'inline-flex' : 'none';
    }
  } else {
    if (authLabel) authLabel.textContent = 'Sign In';
    if (adminNavBtn) adminNavBtn.style.display = 'none';
  }
}
