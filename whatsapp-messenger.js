// WhatsApp Messaging System - Globall Cloud
// Send notifications, updates, and customer support via WhatsApp

class WhatsAppMessenger {
  constructor() {
    this.apiKey = process.env.WHATSAPP_API_KEY;
    this.phoneNumber = '+964750757737'; // Globall Cloud business number
    this.webhookUrl = 'https://your-domain.com/api/whatsapp/webhook';
    this.messageTemplates = this.setupTemplates();
  }

  // Setup message templates
  setupTemplates() {
    return {
      orderConfirmation: {
        title: 'Order Confirmation',
        body: 'Your shipment {{orderId}} has been confirmed!\n📦 Weight: {{weight}}kg\n🚚 Type: {{type}}\n💰 Cost: ${{cost}}',
        footer: 'Track your package: {{trackingLink}}'
      },
      warehouseReceived: {
        title: 'Warehouse Received',
        body: 'Your package has been received at our warehouse!\n📍 Location: {{location}}\n⏰ Time: {{timestamp}}',
        footer: 'Tracking ID: {{orderId}}'
      },
      inTransit: {
        title: 'In Transit',
        body: 'Your shipment is on the way!\n✈️ {{method}}\n📍 From: {{origin}}\n🎯 To: {{destination}}\n⏱️ ETA: {{eta}}',
        footer: 'Real-time tracking available'
      },
      customsClearance: {
        title: 'Customs Update',
        body: 'Your package is in customs clearance\n🔍 Status: {{status}}\n📋 Documents: {{documents}}',
        footer: 'Need help? Reply with your questions'
      },
      outForDelivery: {
        title: 'Out for Delivery',
        body: 'Your package is out for delivery today!\n🚗 Driver: {{driver}}\n📱 Contact: {{driverPhone}}\n🏠 Address: {{address}}',
        footer: 'Track live location'
      },
      delivered: {
        title: 'Delivered Successfully',
        body: 'Your package has been delivered!\n✅ Delivered at: {{timestamp}}\n📍 Location: {{location}}\n👤 Recipient: {{recipient}}',
        footer: 'Thank you for using Globall Cloud'
      },
      delayed: {
        title: 'Shipment Delayed',
        body: 'Your shipment has been delayed\n⚠️ Reason: {{reason}}\n📅 New ETA: {{newEta}}\n💬 Details: {{details}}',
        footer: 'We apologize for the inconvenience. Support team is ready to help'
      },
      priceQuote: {
        title: 'Your Price Quote',
        body: 'Price Quote for {{type}} shipping:\n📦 Weight: {{weight}}kg\n📍 Route: {{route}}\n💰 Base Price: ${{basePrice}}\n🎁 Discount: {{discount}}%\n✨ Final Price: ${{finalPrice}}\n⏱️ Delivery: {{deliveryTime}} days',
        footer: 'Reply YES to confirm or ask questions'
      },
      supportResponse: {
        title: 'Support Team Response',
        body: 'Hello {{name}}!\n\n{{message}}\n\nOrder: {{orderId}}',
        footer: 'Globall Cloud Support Team'
      }
    };
  }

  // Send WhatsApp message
  async sendMessage(recipientPhone, templateName, variables = {}) {
    try {
      const template = this.messageTemplates[templateName];
      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }

      // Replace variables in template
      const body = this.replaceVariables(template.body, variables);
      const footer = this.replaceVariables(template.footer, variables);

      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(recipientPhone),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en'
          },
          body: {
            parameters: this.extractParameters(variables)
          }
        }
      };

      const response = await this.makeApiCall('/messages', payload);
      console.log('WhatsApp message sent:', response);
      return response;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  // Send message with quick replies
  async sendQuickReplyMessage(recipientPhone, message, replies) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(recipientPhone),
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: message
          },
          action: {
            buttons: replies.map((reply, index) => ({
              type: 'reply',
              reply: {
                id: `reply_${index}`,
                title: reply
              }
            }))
          }
        }
      };

      const response = await this.makeApiCall('/messages', payload);
      return response;
    } catch (error) {
      console.error('Error sending quick reply:', error);
      throw error;
    }
  }

  // Send location message
  async sendLocationMessage(recipientPhone, latitude, longitude, locationName) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(recipientPhone),
        type: 'location',
        location: {
          latitude,
          longitude,
          name: locationName,
          address: locationName
        }
      };

      return await this.makeApiCall('/messages', payload);
    } catch (error) {
      console.error('Error sending location:', error);
      throw error;
    }
  }

  // Send media message (image, document)
  async sendMediaMessage(recipientPhone, mediaType, mediaUrl, caption = '') {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(recipientPhone),
        type: mediaType,
        [mediaType]: {
          link: mediaUrl,
          caption: caption
        }
      };

      return await this.makeApiCall('/messages', payload);
    } catch (error) {
      console.error('Error sending media:', error);
      throw error;
    }
  }

  // Handle incoming webhook
  handleWebhook(payload) {
    const message = payload.entry[0].changes[0].value.messages[0];
    const sender = payload.entry[0].changes[0].value.contacts[0].wa_id;

    if (message.type === 'text') {
      return this.handleTextMessage(sender, message.text.body);
    } else if (message.type === 'button') {
      return this.handleButtonReply(sender, message.button.payload);
    }
  }

  // Handle text message from customer
  async handleTextMessage(senderPhone, messageText) {
    // Check for keywords
    const text = messageText.toLowerCase();

    if (text.includes('track')) {
      return this.sendMessage(senderPhone, 'supportResponse', {
        name: 'Customer',
        message: 'Please provide your tracking/order ID to track your shipment',
        orderId: 'N/A'
      });
    } else if (text.includes('quote') || text.includes('price')) {
      return this.sendMessage(senderPhone, 'supportResponse', {
        name: 'Customer',
        message: 'Please provide details: Weight, Destination, Shipment Type',
        orderId: 'N/A'
      });
    } else if (text.includes('help') || text.includes('support')) {
      return await this.sendQuickReplyMessage(
        senderPhone,
        'How can we help you?',
        ['Track Shipment', 'Get Quote', 'Report Issue', 'Contact Support']
      );
    }

    // Default response
    return this.sendMessage(senderPhone, 'supportResponse', {
      name: 'Customer',
      message: 'Thank you for contacting Globall Cloud. Our team will respond shortly.',
      orderId: 'N/A'
    });
  }

  // Handle button reply from customer
  async handleButtonReply(senderPhone, payload) {
    console.log('Button reply received:', payload);
    // Process button response
  }

  // Make API call to WhatsApp
  async makeApiCall(endpoint, payload) {
    const url = `https://graph.instagram.com/v18.0/{{WHATSAPP_PHONE_NUMBER_ID}}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Format phone number to WhatsApp format
  formatPhoneNumber(phone) {
    // Remove all non-digits
    let digits = phone.replace(/\D/g, '');
    // Add country code if missing
    if (!digits.startsWith('964')) {
      digits = '964' + digits.slice(-10);
    }
    return digits;
  }

  // Replace variables in template
  replaceVariables(text, variables) {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(`{{${key}}}`, value);
    }
    return result;
  }

  // Extract parameters from variables
  extractParameters(variables) {
    return Object.values(variables).map(v => ({
      type: 'text',
      text: String(v)
    }));
  }

  // Send bulk messages to multiple customers
  async sendBulkMessages(recipients, templateName, variables = []) {
    const results = [];
    for (let i = 0; i < recipients.length; i++) {
      try {
        const result = await this.sendMessage(
          recipients[i],
          templateName,
          variables[i] || variables[0]
        );
        results.push({ phone: recipients[i], success: true, messageId: result.messages[0].id });
      } catch (error) {
        results.push({ phone: recipients[i], success: false, error: error.message });
      }
    }
    return results;
  }
}

// Initialize global messenger
window.whatsappMessenger = new WhatsAppMessenger();
