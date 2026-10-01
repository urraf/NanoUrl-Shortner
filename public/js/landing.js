/**
 * Landing Page — JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // ---- Update nav for logged-in users ----
  if (api.isAuthenticated()) {
    const loginBtn = document.getElementById('navLoginBtn');
    const signupBtn = document.getElementById('navSignupBtn');
    if (loginBtn) {
      loginBtn.textContent = 'Dashboard';
      loginBtn.href = '/dashboard';
    }
    if (signupBtn) signupBtn.style.display = 'none';
  }

  // ---- URL Shortener Form ----
  const form = document.getElementById('shortenForm');
  const urlInput = document.getElementById('urlInput');
  const shortenBtn = document.getElementById('shortenBtn');
  const btnText = document.getElementById('btnText');
  const resultCard = document.getElementById('resultCard');
  const shortUrlOutput = document.getElementById('shortUrlOutput');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return;

    btnText.textContent = 'Shortening...';
    shortenBtn.disabled = true;

    try {
      const data = await api.shortenUrl(url);
      shortUrlOutput.textContent = data.shortUrl;
      shortUrlOutput.href = toHref(data.shortUrl);
      resultCard.classList.add('show');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnText.textContent = 'Shorten';
      shortenBtn.disabled = false;
    }
  });

  // ---- Tabs ----
  window.switchLandingTab = function (tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}TabContent`).classList.add('active');
  };

  // ---- QR Generator Form ----
  const qrForm = document.getElementById('qrForm');
  const qrUrlInput = document.getElementById('qrUrlInput');
  const qrBtn = document.getElementById('qrBtn');
  const qrBtnText = document.getElementById('qrBtnText');
  const qrResultCard = document.getElementById('qrResultCard');
  const landingQrImage = document.getElementById('landingQrImage');

  function resetQrButton() {
    qrBtnText.textContent = 'Generate';
    qrBtn.disabled = false;
  }

  landingQrImage.onload = () => {
    qrResultCard.classList.add('show');
    resetQrButton();
  };
  landingQrImage.onerror = () => {
    showToast('Could not generate QR code. Please try again.', 'error');
    resetQrButton();
  };

  qrForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = qrUrlInput.value.trim();
    if (!url) return;

    qrBtnText.textContent = 'Generating...';
    qrBtn.disabled = true;
    qrResultCard.classList.remove('show');

    landingQrImage.src = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=' + encodeURIComponent(url);
  });

  // Fetch as a blob so the download works for a cross-origin image
  window.downloadLandingQr = async function () {
    try {
      const res = await fetch(landingQrImage.src);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.download = 'qr-code.png';
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(landingQrImage.src, '_blank');
    }
  };
});
