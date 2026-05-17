-- 002_create_enums.sql
-- All ENUM types used in the schema

CREATE TYPE user_role AS ENUM ('customer', 'seller', 'admin');

CREATE TYPE user_status AS ENUM ('active', 'suspended');

CREATE TYPE seller_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TYPE order_status AS ENUM (
  'pending',
  'accepted',
  'preparing',
  'ready',
  'delivered',
  'cancelled'
);

CREATE TYPE notification_type AS ENUM (
  'order_placed',
  'order_accepted',
  'order_preparing',
  'order_ready',
  'order_delivered',
  'order_cancelled',
  'order_auto_cancelled',
  'seller_approved',
  'seller_rejected',
  'seller_suspended',
  'account_suspended',
  'system'
);
