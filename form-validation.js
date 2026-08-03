// Enhanced Form Validation System - Globall Cloud
// Real-time validation, error messages, form state management

class FormValidator {
  constructor() {
    this.forms = new Map();
    this.validationRules = new Map();
    this.errors = new Map();
    this.setupDefaultRules();
  }

  // Setup default validation rules
  setupDefaultRules() {
    this.validationRules.set('email', {
      regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
      type: 'email'
    });

    this.validationRules.set('phone', {
      regex: /^[0-9+\-\s()]{10,}$/,
      message: 'Please enter a valid phone number (at least 10 digits)',
      type: 'tel'
    });

    this.validationRules.set('name', {
      regex: /^[a-zA-Z\u0600-\u06FF\s]{2,100}$/,
      message: 'Name must be 2-100 characters (letters only)',
      type: 'text'
    });

    this.validationRules.set('weight', {
      regex: /^[0-9]+(\.[0-9]{1,2})?$/,
      message: 'Please enter a valid weight',
      type: 'number',
      min: 0.1,
      max: 10000
    });

    this.validationRules.set('required', {
      validator: (value) => value && value.toString().trim().length > 0,
      message: 'This field is required'
    });
  }

  // Initialize form validation
  initializeForm(formId, config = {}) {
    const form = document.getElementById(formId);
    if (!form) return;

    this.forms.set(formId, {
      element: form,
      fields: new Map(),
      config: config,
      isValid: false
    });

    // Setup field listeners
    form.querySelectorAll('[data-validate]').forEach(field => {
      this.setupFieldValidation(formId, field);
    });

    // Setup form submit
    form.addEventListener('submit', (e) => this.handleFormSubmit(e, formId));
  }

  // Setup individual field validation
  setupFieldValidation(formId, field) {
    const fieldName = field.name || field.id;
    const rules = field.dataset.validate.split(',').map(r => r.trim());

    const formData = this.forms.get(formId);
    if (!formData) return;

    formData.fields.set(fieldName, {
      element: field,
      rules: rules,
      errors: [],
      touched: false
    });

    // Real-time validation on input
    field.addEventListener('input', () => {
      this.validateField(formId, fieldName);
      this.updateFieldUI(formId, fieldName);
    });

    // Mark field as touched
    field.addEventListener('blur', () => {
      formData.fields.get(fieldName).touched = true;
      this.updateFieldUI(formId, fieldName);
    });

    // Handle focus to show helper text
    field.addEventListener('focus', () => {
      this.showFieldHelper(formId, fieldName);
    });
  }

  // Validate single field
  validateField(formId, fieldName) {
    const formData = this.forms.get(formId);
    if (!formData) return true;

    const fieldData = formData.fields.get(fieldName);
    if (!fieldData) return true;

    const field = fieldData.element;
    const value = field.value;
    const rules = fieldData.rules;
    const errors = [];

    // Run each validation rule
    for (const rule of rules) {
      const ruleData = this.validationRules.get(rule);
      if (!ruleData) continue;

      // Check required
      if (rule === 'required') {
        if (!ruleData.validator(value)) {
          errors.push(ruleData.message);
        }
      }
      // Check regex pattern
      else if (ruleData.regex) {
        if (value && !ruleData.regex.test(value)) {
          errors.push(ruleData.message);
        }
      }
      // Check min/max
      if (ruleData.min !== undefined && value) {
        const numValue = parseFloat(value);
        if (numValue < ruleData.min) {
          errors.push(`Minimum value is ${ruleData.min}`);
        }
      }
      if (ruleData.max !== undefined && value) {
        const numValue = parseFloat(value);
        if (numValue > ruleData.max) {
          errors.push(`Maximum value is ${ruleData.max}`);
        }
      }
    }

    fieldData.errors = errors;
    return errors.length === 0;
  }

  // Validate entire form
  validateForm(formId) {
    const formData = this.forms.get(formId);
    if (!formData) return false;

    let isValid = true;
    formData.fields.forEach((fieldData, fieldName) => {
      fieldData.touched = true;
      const fieldValid = this.validateField(formId, fieldName);
      this.updateFieldUI(formId, fieldName);
      if (!fieldValid) isValid = false;
    });

    formData.isValid = isValid;
    return isValid;
  }

  // Update field UI (error messages, styling)
  updateFieldUI(formId, fieldName) {
    const formData = this.forms.get(formId);
    if (!formData) return;

    const fieldData = formData.fields.get(fieldName);
    if (!fieldData) return;

    const field = fieldData.element;
    const errors = fieldData.errors;
    const touched = fieldData.touched;
    const container = field.closest('.form-row') || field.parentElement;
    let errorContainer = container.querySelector('.field-error');

    // Remove old error container
    if (errorContainer) errorContainer.remove();

    // Add new error if field is touched and has errors
    if (touched && errors.length > 0) {
      field.classList.add('field-invalid');
      errorContainer = document.createElement('div');
      errorContainer.className = 'field-error';
      errorContainer.innerHTML = errors.map(err => `
        <div class="error-message">
          <svg class="icon-sm"><use href="#i-x"></use></svg>
          <span>${err}</span>
        </div>
      `).join('');
      container.appendChild(errorContainer);
    } else {
      field.classList.remove('field-invalid');
    }
  }

  // Show field helper text
  showFieldHelper(formId, fieldName) {
    const formData = this.forms.get(formId);
    if (!formData) return;

    const fieldData = formData.fields.get(fieldName);
    if (!fieldData) return;

    const field = fieldData.element;
    const rules = fieldData.rules;
    const container = field.closest('.form-row') || field.parentElement;
    let helperContainer = container.querySelector('.field-helper');

    if (!helperContainer) {
      helperContainer = document.createElement('div');
      helperContainer.className = 'field-helper';
      container.appendChild(helperContainer);
    }

    const helpers = [];
    for (const rule of rules) {
      const ruleData = this.validationRules.get(rule);
      if (ruleData && ruleData.message) {
        helpers.push(ruleData.message);
      }
    }

    if (helpers.length > 0) {
      helperContainer.innerHTML = `
        <div class="helper-text">
          <svg class="icon-sm"><use href="#i-info"></use></svg>
          <span>${helpers[0]}</span>
        </div>
      `;
      helperContainer.style.display = 'block';
    } else {
      helperContainer.style.display = 'none';
    }
  }

  // Handle form submit
  handleFormSubmit(e, formId) {
    e.preventDefault();

    // Validate all fields
    if (!this.validateForm(formId)) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    const formData = this.forms.get(formId);
    const formElement = formData.element;

    // Collect form data
    const data = new FormData(formElement);
    const formValues = Object.fromEntries(data);

    // Trigger custom submit event
    const submitEvent = new CustomEvent('validatedSubmit', {
      detail: formValues,
      bubbles: true
    });
    formElement.dispatchEvent(submitEvent);
  }

  // Get form data
  getFormData(formId) {
    const formData = this.forms.get(formId);
    if (!formData) return null;

    const data = {};
    formData.fields.forEach((fieldData, fieldName) => {
      data[fieldName] = fieldData.element.value;
    });
    return data;
  }

  // Reset form
  resetForm(formId) {
    const formData = this.forms.get(formId);
    if (!formData) return;

    formData.element.reset();
    formData.fields.forEach((fieldData) => {
      fieldData.errors = [];
      fieldData.touched = false;
      this.updateFieldUI(formId, fieldData.element.name);
    });
  }

  // Add custom validation rule
  addRule(ruleName, validator) {
    this.validationRules.set(ruleName, validator);
  }
}

// Initialize global validator
window.formValidator = new FormValidator();

// Auto-initialize forms with data-validate-form attribute
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-validate-form]').forEach(form => {
    window.formValidator.initializeForm(form.id);
  });
});
