let checkoutPromise;

function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!checkoutPromise) {
    checkoutPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-stayveo-razorpay]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.Razorpay));
        existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.stayveoRazorpay = 'true';
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => reject(new Error('Unable to load Razorpay checkout'));
      document.body.appendChild(script);
    });
  }
  return checkoutPromise;
}

export async function openRazorpayCheckout(options) {
  const Razorpay = await loadCheckoutScript();
  if (!Razorpay) throw new Error('Razorpay checkout is unavailable');

  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: options.key,
      amount: options.amount,
      currency: options.currency || 'INR',
      name: 'StayVeo',
      description: options.description || 'StayVeo payment',
      order_id: options.orderId,
      prefill: options.prefill,
      notes: options.notes,
      theme: { color: '#176b45' },
      handler: resolve,
      modal: { ondismiss: () => reject(new Error('Payment checkout was dismissed')) },
    });
    checkout.on('payment.failed', (response) => reject(new Error(response?.error?.description || 'Razorpay payment failed')));
    checkout.open();
  });
}
