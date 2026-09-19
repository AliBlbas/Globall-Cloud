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

  // Initialize form validation.
  // By default this also takes over the form's submit event (validates, then
  // fires a 'validatedSubmit' custom event with the form data on success).
  // Pages that already have their own submit handler — and just want live
  // field-level validation plus a validateForm(formId) gate to call from
  // that handler — should pass { manageSubmit: false } to skip attaching
  // our own submit listener and avoid a second one racing it.
  initializeForm(formId, config = {}) {
    const form = document.getElementById(formId);
    if (!form) return;

    this.forms.set(formId, {
      element: form,
      fields: new Map(),
      config: config,
      isValid: false
    });

    form.querySelectorAll('[data-validate]').forEach(field => {
      this.setupFieldValidation(formId, field);
    });

    if (config.manageSubmit !== false) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e, formId));
    }
  }

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

    field.addEventListener('input', () => {
      this.validateField(formId, fieldName);
      this.updateFieldUI(formId, fieldName);
    });

    field.addEventListener('blur', () => {
      const data = formData.fields.get(fieldName);
      if (data) data.touched = true;
      this.updateFieldUI(formId, fieldName);
    });

    field.addEventListener('focus', () => {
      this.showFieldHelper(formId, fieldName);
    });
  }

  validateField(formId, fieldName) {
    const formData = this.forms.get(formId);
    if (!formData) return true;

    const fieldData = formData.fields.get(fieldName);
    if (!fieldData) return true;

    const field = fieldData.element;
    const value = field.value;
    const rules = fieldData.rules;
    const errors = [];

    for (const rule of rules) {
      const ruleData = this.validationRules.get(rule);
      if (!ruleData) continue;

      if (rule === 'required') {
        if (!ruleData.validator(value)) errors.push(ruleData.message);
      } else if (ruleData.regex) {
        if (value && !ruleData.regex.test(value)) errors.push(ruleData.message);
      }
      if (ruleData.min !== undefined && value) {
        const numValue = parseFloat(value);
        if (numValue < ruleData.min) errors.push(`Minimum value is ${ruleData.min}`);
      }
      if (ruleData.max !== undefined && value) {
        const numValue = parseFloat(value);
        if (numValue > ruleData.max) errors.push(`Maximum value is ${ruleData.max}`);
      }
    }

    fieldData.errors = errors;
    return errors.length === 0;
  }

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

  updateFieldUI(formId, fieldName) {
    const formData = this.forms.get(formId);
    if (!formData) return;

    const fieldData = formData.fields.get(fieldName);
    if (!fieldData) return;

    const field = fieldData.element;
    const errors = fieldData.errors;
    const touched = fieldData.touched;
    const container = field.closest('.form-row') || field.parentElement;
    if (!container) return;

    const oldErrorContainer = container.querySelector('.field-error');
    if (oldErrorContainer) oldErrorContainer.remove();

    if (touched && errors.length > 0) {
      field.classList.add('field-invalid');
      const errorContainer = document.createElement('div');
      errorContainer.className = 'field-error';

      for (const err of errors) {
        const item = document.createElement('div');
        item.className = 'error-message';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'icon-sm');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', '18'); line1.setAttribute('y1', '6');
        line1.setAttribute('x2', '6'); line1.setAttribute('y2', '18');
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', '6'); line2.setAttribute('y1', '6');
        line2.setAttribute('x2', '18'); line2.setAttribute('y2', '18');
        svg.append(line1, line2);

        const span = document.createElement('span');
        span.textContent = String(err);
        item.append(svg, span);
        errorContainer.appendChild(item);
      }

      container.appendChild(errorContainer);
    } else {
      field.classList.remove('field-invalid');
    }
  }

  showFieldHelper(formId, fieldName) {
    const formData = this.forms.get(formId);
    if (!formData) return;

    const fieldData = formData.fields.get(fieldName);
    if (!fieldData) return;

    const field = fieldData.element;
    const rules = fieldData.rules;
    const container = field.closest('.form-row') || field.parentElement;
    if (!container) return;

    let helperContainer = container.querySelector('.field-helper');
    if (!helperContainer) {
      helperContainer = document.createElement('div');
      helperContainer.className = 'field-helper';
      container.appendChild(helperContainer);
    }

    const helpers = [];
    for (const rule of rules) {
      const ruleData = this.validationRules.get(rule);
      if (ruleData && ruleData.message) helpers.push(ruleData.message);
    }

    helperContainer.replaceChildren();
    if (helpers.length > 0) {
      const helper = document.createElement('div');
      helper.className = 'helper-text';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'icon-sm');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '9');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '12'); line.setAttribute('y1', '11'); line.setAttribute('x2', '12'); line.setAttribute('y2', '16');
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', '12'); dot.setAttribute('cy', '7.5'); dot.setAttribute('r', '1');
      dot.setAttribute('fill', 'currentColor'); dot.setAttribute('stroke', 'none');
      svg.append(circle, line, dot);
      const span = document.createElement('span');
      span.textContent = String(helpers[0]);
      helper.append(svg, span);
      helperContainer.appendChild(helper);
      helperContainer.style.display = 'block';
    } else {
      helperContainer.style.display = 'none';
    }
  }

  handleFormSubmit(e, formId) {
    e.preventDefault();

    if (!this.validateForm(formId)) {
      if (typeof showToast === 'function') showToast('Please fix the errors in the form', 'error');
      return;
    }

    const formData = this.forms.get(formId);
    const formElement = formData.element;
    const data = new FormData(formElement);
    const formValues = Object.fromEntries(data);

    const submitEvent = new CustomEvent('validatedSubmit', {
      detail: formValues,
      bubbles: true
    });
    formElement.dispatchEvent(submitEvent);
  }

  getFormData(formId) {
    const formData = this.forms.get(formId);
    if (!formData) return null;

    const data = {};
    formData.fields.forEach((fieldData, fieldName) => {
      data[fieldName] = fieldData.element.value;
    });
    return data;
  }

  resetForm(formId) {
    const formData = this.forms.get(formId);
    if (!formData) return;

    formData.element.reset();
    formData.fields.forEach((fieldData, fieldName) => {
      fieldData.errors = [];
      fieldData.touched = false;
      this.updateFieldUI(formId, fieldName);
    });
  }

  addRule(ruleName, validator) {
    this.validationRules.set(ruleName, validator);
  }
}

window.formValidator = new FormValidator();

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-validate-form]').forEach(form => {
    window.formValidator.initializeForm(form.id);
  });
});
