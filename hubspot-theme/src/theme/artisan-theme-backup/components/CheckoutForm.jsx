import React, { useState, useEffect } from 'react';
import Input from './Input';
import Button from './Button';

/**
 * CheckoutForm component
 * Multi-step form for collecting contact, shipping, and billing information
 */
const CheckoutForm = ({
  onSubmit,
  loading = false,
  className = '',
}) => {
  const [formData, setFormData] = useState({
    // Contact Information
    email: '',
    phone: '',
    
    // Shipping Address
    firstName: '',
    lastName: '',
    shippingLine1: '',
    shippingLine2: '',
    shippingCity: '',
    shippingState: '',
    shippingPostalCode: '',
    shippingCountry: 'US',
    
    // Billing Address
    sameAsShipping: true,
    billingLine1: '',
    billingLine2: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
    billingCountry: 'US',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Load saved form data from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('checkout_form_data');
      if (saved) {
        setFormData({ ...formData, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Error loading saved form data:', error);
    }
  }, []);

  // Save form data to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('checkout_form_data', JSON.stringify(formData));
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  }, [formData]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
    validateField(field, formData[field]);
  };

  const validateField = (field, value) => {
    let error = null;

    switch (field) {
      case 'email':
        if (!value) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email';
        }
        break;

      case 'phone':
        if (!value) {
          error = 'Phone number is required';
        } else if (!/^\+?[\d\s()-]{10,}$/.test(value)) {
          error = 'Please enter a valid phone number';
        }
        break;

      case 'firstName':
      case 'lastName':
        if (!value) {
          error = `${field === 'firstName' ? 'First' : 'Last'} name is required`;
        }
        break;

      case 'shippingLine1':
        if (!value) {
          error = 'Street address is required';
        }
        break;

      case 'shippingCity':
        if (!value) {
          error = 'City is required';
        }
        break;

      case 'shippingState':
        if (!value) {
          error = 'State is required';
        }
        break;

      case 'shippingPostalCode':
        if (!value) {
          error = 'ZIP code is required';
        } else if (!/^\d{5}(-\d{4})?$/.test(value)) {
          error = 'Please enter a valid ZIP code';
        }
        break;

      case 'billingLine1':
        if (!formData.sameAsShipping && !value) {
          error = 'Billing address is required';
        }
        break;

      case 'billingCity':
        if (!formData.sameAsShipping && !value) {
          error = 'Billing city is required';
        }
        break;

      case 'billingState':
        if (!formData.sameAsShipping && !value) {
          error = 'Billing state is required';
        }
        break;

      case 'billingPostalCode':
        if (!formData.sameAsShipping && !value) {
          error = 'Billing ZIP code is required';
        } else if (!formData.sameAsShipping && !/^\d{5}(-\d{4})?$/.test(value)) {
          error = 'Please enter a valid ZIP code';
        }
        break;

      default:
        break;
    }

    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));

    return error;
  };

  const validateForm = () => {
    const fieldsToValidate = [
      'email',
      'phone',
      'firstName',
      'lastName',
      'shippingLine1',
      'shippingCity',
      'shippingState',
      'shippingPostalCode',
    ];

    if (!formData.sameAsShipping) {
      fieldsToValidate.push(
        'billingLine1',
        'billingCity',
        'billingState',
        'billingPostalCode'
      );
    }

    const newErrors = {};
    fieldsToValidate.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    setTouched(
      fieldsToValidate.reduce((acc, field) => ({ ...acc, [field]: true }), {})
    );

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Prepare checkout data
      const checkoutData = {
        customerInfo: {
          email: formData.email,
          phone: formData.phone,
          firstName: formData.firstName,
          lastName: formData.lastName,
          shippingAddress: {
            line1: formData.shippingLine1,
            line2: formData.shippingLine2,
            city: formData.shippingCity,
            state: formData.shippingState,
            postalCode: formData.shippingPostalCode,
            country: formData.shippingCountry,
          },
          billingAddress: formData.sameAsShipping
            ? {
                line1: formData.shippingLine1,
                line2: formData.shippingLine2,
                city: formData.shippingCity,
                state: formData.shippingState,
                postalCode: formData.shippingPostalCode,
                country: formData.shippingCountry,
              }
            : {
                line1: formData.billingLine1,
                line2: formData.billingLine2,
                city: formData.billingCity,
                state: formData.billingState,
                postalCode: formData.billingPostalCode,
                country: formData.billingCountry,
              },
        },
      };

      if (onSubmit) {
        onSubmit(checkoutData);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-8 ${className}`}>
      {/* Contact Information */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
          Contact Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            error={touched.email && !!errors.email}
            errorMessage={errors.email}
          />
          
          <Input
            type="tel"
            label="Phone Number"
            placeholder="(555) 123-4567"
            value={formData.phone}
            onChange={handleChange('phone')}
            onBlur={handleBlur('phone')}
            error={touched.phone && !!errors.phone}
            errorMessage={errors.phone}
          />
        </div>
      </div>

      {/* Shipping Address */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
          Shipping Address
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="text"
              label="First Name"
              placeholder="John"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              onBlur={handleBlur('firstName')}
              error={touched.firstName && !!errors.firstName}
              errorMessage={errors.firstName}
            />
            
            <Input
              type="text"
              label="Last Name"
              placeholder="Doe"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              onBlur={handleBlur('lastName')}
              error={touched.lastName && !!errors.lastName}
              errorMessage={errors.lastName}
            />
          </div>

          <Input
            type="text"
            label="Street Address"
            placeholder="123 Main St"
            value={formData.shippingLine1}
            onChange={handleChange('shippingLine1')}
            onBlur={handleBlur('shippingLine1')}
            error={touched.shippingLine1 && !!errors.shippingLine1}
            errorMessage={errors.shippingLine1}
          />

          <Input
            type="text"
            label="Apartment, suite, etc. (optional)"
            placeholder="Apt 4B"
            value={formData.shippingLine2}
            onChange={handleChange('shippingLine2')}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="text"
              label="City"
              placeholder="New York"
              value={formData.shippingCity}
              onChange={handleChange('shippingCity')}
              onBlur={handleBlur('shippingCity')}
              error={touched.shippingCity && !!errors.shippingCity}
              errorMessage={errors.shippingCity}
            />
            
            <Input
              type="text"
              label="State"
              placeholder="NY"
              value={formData.shippingState}
              onChange={handleChange('shippingState')}
              onBlur={handleBlur('shippingState')}
              error={touched.shippingState && !!errors.shippingState}
              errorMessage={errors.shippingState}
            />
            
            <Input
              type="text"
              label="ZIP Code"
              placeholder="10001"
              value={formData.shippingPostalCode}
              onChange={handleChange('shippingPostalCode')}
              onBlur={handleBlur('shippingPostalCode')}
              error={touched.shippingPostalCode && !!errors.shippingPostalCode}
              errorMessage={errors.shippingPostalCode}
            />
          </div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
          Billing Address
        </h2>
        
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.sameAsShipping}
              onChange={handleChange('sameAsShipping')}
              className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-gray-700">Same as shipping address</span>
          </label>
        </div>

        {!formData.sameAsShipping && (
          <div className="space-y-4">
            <Input
              type="text"
              label="Street Address"
              placeholder="123 Main St"
              value={formData.billingLine1}
              onChange={handleChange('billingLine1')}
              onBlur={handleBlur('billingLine1')}
              error={touched.billingLine1 && !!errors.billingLine1}
              errorMessage={errors.billingLine1}
            />

            <Input
              type="text"
              label="Apartment, suite, etc. (optional)"
              placeholder="Apt 4B"
              value={formData.billingLine2}
              onChange={handleChange('billingLine2')}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                type="text"
                label="City"
                placeholder="New York"
                value={formData.billingCity}
                onChange={handleChange('billingCity')}
                onBlur={handleBlur('billingCity')}
                error={touched.billingCity && !!errors.billingCity}
                errorMessage={errors.billingCity}
              />
              
              <Input
                type="text"
                label="State"
                placeholder="NY"
                value={formData.billingState}
                onChange={handleChange('billingState')}
                onBlur={handleBlur('billingState')}
                error={touched.billingState && !!errors.billingState}
                errorMessage={errors.billingState}
              />
              
              <Input
                type="text"
                label="ZIP Code"
                placeholder="10001"
                value={formData.billingPostalCode}
                onChange={handleChange('billingPostalCode')}
                onBlur={handleBlur('billingPostalCode')}
                error={touched.billingPostalCode && !!errors.billingPostalCode}
                errorMessage={errors.billingPostalCode}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={loading}
        >
          Continue to Payment
        </Button>
      </div>
    </form>
  );
};

export default CheckoutForm;

