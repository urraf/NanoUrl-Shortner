/**
 * Auth Pages — JavaScript
 * Handles login and signup form submission
 */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (api.isAuthenticated()) {
    window.location.href = '/dashboard';
    return;
  }

  // ---- Login Form ----
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('loginBtn');

      btn.textContent = 'Logging in...';
      btn.disabled = true;

      try {
        await api.login(email, password);
        window.location.href = '/dashboard';
      } catch (err) {
        showToast(err.message, 'error');
        btn.textContent = 'Log in';
        btn.disabled = false;
      }
    });
  }

  // ---- Signup Form ----
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const displayName = document.getElementById('displayName')?.value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('signupBtn');

      if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'warning');
        return;
      }

      btn.textContent = 'Creating account...';
      btn.disabled = true;

      try {
        await api.signup(email, password, displayName);
        window.location.href = '/dashboard';
      } catch (err) {
        showToast(err.message, 'error');
        btn.textContent = 'Create account';
        btn.disabled = false;
      }
    });
  }
});

// Password visibility toggle
function togglePassword() {
  const input = document.getElementById('password');
  const btn = input.nextElementSibling;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    btn.textContent = 'Show';
  }
}
