import Joi from 'joi';
import { PASSWORD_MIN_LENGTH, PHONE_DIAL_CODE } from '@/constants/config';
import type {
  LoginInput,
  PasswordResetRequestInput,
  RegisterCustomerInput,
  RegisterSellerInput,
} from '@/types/domain.types';

/**
 * Joi schemas mirror the backend validators.
 * Each error message is user-facing — keep them concise and human.
 */

const emailRule = Joi.string()
  .email({ tlds: { allow: false } })
  .max(255)
  .required()
  .messages({
    'string.empty': 'Email is required',
    'string.email': 'Please enter a valid email',
    'any.required': 'Email is required',
  });

const passwordRule = Joi.string()
  .min(PASSWORD_MIN_LENGTH)
  .max(128)
  .required()
  .messages({
    'string.empty': 'Password is required',
    'string.min': `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    'any.required': 'Password is required',
  });

const phoneRule = Joi.string()
  .pattern(new RegExp(`^\\${PHONE_DIAL_CODE}[5-7]\\d{8}$`))
  .required()
  .messages({
    'string.pattern.base': 'Please enter a valid Moroccan phone number',
    'string.empty': 'Phone is required',
    'any.required': 'Phone is required',
  });

const nameRule = Joi.string()
  .min(2)
  .max(100)
  .required()
  .messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'any.required': 'Name is required',
  });

export const loginSchema = Joi.object<LoginInput>({
  email: emailRule,
  password: passwordRule,
});

/**
 * Single register schema covering both roles — seller-only fields become
 * required when `role === 'seller'`. Combining them in one schema means
 * we don't have to swap resolvers on toggle (RHF's resolver handling
 * across re-renders is fragile) and `formState.isValid` stays accurate.
 */
export interface RegisterFormValues extends RegisterSellerInput {
  role: 'customer' | 'seller';
}

export const registerSchema = Joi.object<RegisterFormValues>({
  role: Joi.string().valid('customer', 'seller').required(),
  name: nameRule,
  email: emailRule,
  phone: phoneRule,
  password: passwordRule,

  business_name: Joi.string()
    .max(100)
    .when('role', {
      is: 'seller',
      then: Joi.string().min(2).required().messages({
        'string.empty': 'Business name is required',
        'string.min': 'Business name must be at least 2 characters',
      }),
      otherwise: Joi.string().allow('').optional(),
    }),

  city: Joi.string()
    .max(100)
    .when('role', {
      is: 'seller',
      then: Joi.string().min(2).required().messages({
        'string.empty': 'City is required',
      }),
      otherwise: Joi.string().allow('').optional(),
    }),

  delivery_radius_km: Joi.any().when('role', {
    is: 'seller',
    then: Joi.number().integer().min(1).max(30).required().messages({
      'number.base': 'Delivery radius must be a number',
      'number.min': 'Delivery radius must be at least 1 km',
      'number.max': 'Delivery radius can\'t exceed 30 km',
    }),
    otherwise: Joi.any().optional(),
  }),
});

export const passwordResetRequestSchema = Joi.object<PasswordResetRequestInput>({
  email: emailRule,
});
