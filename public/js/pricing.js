/**
 * Pricing Page — JavaScript
 * Handles Razorpay subscription checkout
 */

document.addEventListener('DOMContentLoaded', () => {
  // Update nav for logged-in users
  if (api.isAuthenticated()) {
    const loginBtn = document.getElementById('navLoginBtn');
    const signupBtn = document.getElementById('navSignupBtn');
    if (loginBtn) { loginBtn.textContent = 'Dashboard'; loginBtn.href = '/dashboard'; }
    if (signupBtn) signupBtn.style.display = 'none';
  }
});

// ---- Subscribe ----
async function handleSubscribe(planType) {
  try {
    showToast('Processing payment...', 'info');

    // This bypasses Razorpay entirely and upgrades the user
    await api.request('POST', '/payments/mock-upgrade', { planType });

    // Instantly sync the new profile into localStorage
    try {
      const profile = await api.getProfile();
      if(profile) api.setAuth(profile, api.accessToken);
    } catch(e) {}

    showToast('Payment successful. Your plan has been upgraded.', 'success');
    
    // Refresh user data or just redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  } catch (err) {
    if (err.statusCode === 401 || err.message.toLowerCase().includes('unauthorized')) {
      showToast('Please sign up or log in first', 'warning');
      setTimeout(() => window.location.href = '/login', 1500);
    } else {
      showToast(err.message || 'Payment upgrade failed', 'error');
    }
  }
}
