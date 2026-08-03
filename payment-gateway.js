// Payment Gateway Integration (Stripe + PayPal)
// Handle payments for shipments and orders

class PaymentGateway {
  constructor() {
    this.stripeKey = process.env.STRIPE_PUBLIC_KEY;
    this.paypalClientId = process.env.PAYPAL_CLIENT_ID;
    this.stripe = window.Stripe ? window.Stripe(this.stripeKey) : null;
    this.pendingPayments = new Map();
  }

  // Initialize Stripe payment element
  async initializeStripePayment(orderId, amount, currency = 'USD') {
    try {
      // Create payment intent on backend
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: Math.round(amount * 100), // Stripe uses cents
          currency: currency.toLowerCase()
        })
      });

      const { clientSecret } = await response.json();

      // Create payment form element
      const elements = this.stripe.elements({
        clientSecret: clientSecret,
        appearance: {
          theme: 'dark',
          variables: {
            colorPrimary: '#00D4FF',
            colorText: '#F5F9FD',
            fontFamily: '"Vazirmatn", sans-serif'
          }
        }
      });

      // Mount payment element
      const paymentElement = elements.create('payment');
      paymentElement.mount('#payment-element');

      // Store for later use
      this.pendingPayments.set(orderId, { clientSecret, elements });

      return { success: true, clientSecret };
    } catch (error) {
      console.error('Error initializing Stripe payment:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle Stripe payment submission
  async submitStripePayment(orderId) {
    const payment = this.pendingPayments.get(orderId);
    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    try {
      const { error, paymentIntent } = await this.stripe.confirmPayment({
        elements: payment.elements,
        confirmParams: {
          return_url: `https://globall-cloud.pages.dev/payment-success?orderId=${orderId}`
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (paymentIntent.status === 'succeeded') {
        // Payment successful, update order
        await this.updateOrderPaymentStatus(orderId, 'completed', paymentIntent.id);
        return { success: true, paymentId: paymentIntent.id };
      }
    } catch (error) {
      console.error('Error submitting Stripe payment:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize PayPal payment
  async initializePayPalPayment(orderId, amount, currency = 'USD') {
    try {
      // Load PayPal SDK if not already loaded
      if (!window.paypal) {
        await this.loadPayPalSDK();
      }

      // Create order on PayPal
      const response = await fetch('/api/create-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount,
          currency
        })
      });

      const { id: paypalOrderId } = await response.json();

      // Render PayPal buttons
      await window.paypal.Buttons({
        createOrder: async () => paypalOrderId,
        onApprove: async (data) => {
          return await this.capturePayPalPayment(orderId, data.orderID);
        },
        onError: (err) => {
          console.error('PayPal error:', err);
          showToast('Payment failed. Please try again.', 'error');
        }
      }).render('#paypal-button-container');

      return { success: true, paypalOrderId };
    } catch (error) {
      console.error('Error initializing PayPal payment:', error);
      return { success: false, error: error.message };
    }
  }

  // Capture PayPal payment
  async capturePayPalPayment(orderId, paypalOrderId) {
    try {
      const response = await fetch('/api/capture-paypal-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paypalOrderId
        })
      });

      const result = await response.json();

      if (result.status === 'COMPLETED') {
        // Payment successful
        await this.updateOrderPaymentStatus(orderId, 'completed', paypalOrderId);
        return { success: true, paymentId: paypalOrderId };
      } else {
        throw new Error('Payment not completed');
      }
    } catch (error) {
      console.error('Error capturing PayPal payment:', error);
      return { success: false, error: error.message };
    }
  }

  // Load PayPal SDK
  async loadPayPalSDK() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${this.paypalClientId}&currency=USD`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Update order payment status in database
  async updateOrderPaymentStatus(orderId, status, transactionId) {
    try {
      const { error } = await window.supabase
        .from('orders')
        .update({
          payment_status: status,
          transaction_id: transactionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Trigger webhook
      if (status === 'completed') {
        await window.webhookHandler.handlePaymentCompleted({
          transactionId,
          orderId,
          paymentMethod: 'stripe' // or 'paypal'
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error: error.message };
    }
  }

  // Get payment history for customer
  async getPaymentHistory(customerId) {
    try {
      const { data, error } = await window.supabase
        .from('orders')
        .select('id, total_cost, payment_status, transaction_id, created_at, updated_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, payments: data };
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return { success: false, error: error.message };
    }
  }

  // Refund payment
  async refundPayment(transactionId, amount = null) {
    try {
      const response = await fetch('/api/refund-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          amount // Optional: partial refund
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update order status
        await window.supabase
          .from('orders')
          .update({ payment_status: 'refunded' })
          .eq('transaction_id', transactionId);

        return { success: true, refundId: result.refundId };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error refunding payment:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize global payment gateway
window.paymentGateway = new PaymentGateway();
