'use client';

export default function PayPalCheckoutPage() {
  return (
    <iframe
      src="/paypal-checkout.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0
      }}
      title="PayPal Checkout"
    />
  );
}
