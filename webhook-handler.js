// Webhook Handler for Supabase Events
// Process shipment updates, payments, and notifications

class WebhookHandler {
  constructor() {
    this.routes = new Map();
    this.setupRoutes();
  }

  setupRoutes() {
    this.routes.set('/webhooks/shipment-updated', this.handleShipmentUpdate.bind(this));
    this.routes.set('/webhooks/payment-completed', this.handlePaymentCompleted.bind(this));
    this.routes.set('/webhooks/order-created', this.handleOrderCreated.bind(this));
    this.routes.set('/webhooks/whatsapp-reply', this.handleWhatsAppReply.bind(this));
  }

  // Handle shipment status update
  async handleShipmentUpdate(payload) {
    const { shipmentId, status, location, latitude, longitude, updatedBy } = payload;

    try {
      // Update shipment in database
      const { error } = await window.supabase
        .from('shipments')
        .update({
          status,
          current_location: location,
          latitude,
          longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (error) throw error;

      // Create shipment event
      await window.supabase
        .from('shipment_events')
        .insert([{
          shipment_id: shipmentId,
          event_type: 'status_update',
          status,
          location,
          latitude,
          longitude,
          description: `Shipment status updated to ${status}`
        }]);

      // Get customer and send WhatsApp notification
      const { data: shipment } = await window.supabase
        .from('shipments')
        .select('customer_id')
        .eq('id', shipmentId)
        .single();

      if (shipment) {
        const { data: customer } = await window.supabase
          .from('customers')
          .select('phone')
          .eq('id', shipment.customer_id)
          .single();

        if (customer) {
          // Send appropriate WhatsApp message based on status
          const templateMap = {
            'warehouse': 'warehouseReceived',
            'transit': 'inTransit',
            'customs': 'customsClearance',
            'delivery': 'outForDelivery',
            'delivered': 'delivered',
            'delayed': 'delayed'
          };

          const template = templateMap[status];
          if (template) {
            await window.whatsappMessenger.sendMessage(customer.phone, template, {
              orderId: shipmentId,
              location,
              status,
              timestamp: new Date().toLocaleString()
            });
          }
        }
      }

      return { success: true, message: 'Shipment updated successfully' };
    } catch (error) {
      console.error('Error handling shipment update:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle payment completion
  async handlePaymentCompleted(payload) {
    const { transactionId, orderId, amount, paymentMethod } = payload;

    try {
      // Update order payment status
      const { error } = await window.supabase
        .from('orders')
        .update({
          payment_status: 'completed',
          transaction_id: transactionId,
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Get customer and send confirmation
      const { data: order } = await window.supabase
        .from('orders')
        .select('customer_id, shipment_id')
        .eq('id', orderId)
        .single();

      if (order) {
        const { data: customer } = await window.supabase
          .from('customers')
          .select('phone')
          .eq('id', order.customer_id)
          .single();

        if (customer) {
          await window.whatsappMessenger.sendMessage(customer.phone, 'orderConfirmation', {
            orderId: order.shipment_id,
            amount,
            paymentMethod,
            trackingLink: `https://globall-cloud.pages.dev/track?id=${order.shipment_id}`
          });
        }
      }

      return { success: true, message: 'Payment recorded successfully' };
    } catch (error) {
      console.error('Error handling payment:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle new order creation
  async handleOrderCreated(payload) {
    const { orderId, customerId, shipmentType, weight, origin, destination, cost } = payload;

    try {
      // Get customer details
      const { data: customer } = await window.supabase
        .from('customers')
        .select('phone, full_name')
        .eq('id', customerId)
        .single();

      if (customer) {
        // Send WhatsApp confirmation
        await window.whatsappMessenger.sendMessage(customer.phone, 'orderConfirmation', {
          orderId,
          weight,
          type: shipmentType,
          cost,
          trackingLink: `https://globall-cloud.pages.dev/track?id=${orderId}`
        });
      }

      return { success: true, message: 'Order created webhook processed' };
    } catch (error) {
      console.error('Error handling order creation:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle WhatsApp replies from customers
  async handleWhatsAppReply(payload) {
    const { senderPhone, messageText, messageId } = payload;

    try {
      // Find customer by phone
      const { data: customer } = await window.supabase
        .from('customers')
        .select('id, full_name')
        .eq('phone', senderPhone)
        .single();

      if (!customer) {
        // Customer not found, send help message
        await window.whatsappMessenger.sendMessage(senderPhone, 'supportResponse', {
          name: 'New User',
          message: 'Welcome to Globall Cloud! Please register or log in to track your shipments.',
          orderId: 'N/A'
        });
        return { success: false, message: 'Customer not found' };
      }

      // Create support ticket from WhatsApp message
      const { error } = await window.supabase
        .from('support_messages')
        .insert([{
          customer_id: customer.id,
          message: messageText,
          message_type: 'whatsapp_inbound',
          status: 'open',
          priority: this.determinePriority(messageText)
        }]);

      if (error) throw error;

      // Send acknowledgment
      await window.whatsappMessenger.sendMessage(senderPhone, 'supportResponse', {
        name: customer.full_name,
        message: 'Thank you for your message. Our support team will respond shortly.',
        orderId: 'N/A'
      });

      return { success: true, message: 'WhatsApp reply processed' };
    } catch (error) {
      console.error('Error handling WhatsApp reply:', error);
      return { success: false, error: error.message };
    }
  }

  // Determine priority from message content
  determinePriority(messageText) {
    const text = messageText.toLowerCase();
    if (text.includes('urgent') || text.includes('emergency') || text.includes('asap')) {
      return 'high';
    }
    if (text.includes('help') || text.includes('problem') || text.includes('issue')) {
      return 'medium';
    }
    return 'low';
  }

  // Process webhook request
  async processWebhook(path, payload, signature) {
    // Verify webhook signature
    if (!this.verifySignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const handler = this.routes.get(path);
    if (!handler) {
      throw new Error(`No handler found for path: ${path}`);
    }

    return await handler(payload);
  }

  // Verify webhook signature
  verifySignature(payload, signature) {
    // Implement HMAC verification here
    // This is a placeholder - implement based on your webhook provider
    return true;
  }
}

// Initialize global webhook handler
window.webhookHandler = new WebhookHandler();
