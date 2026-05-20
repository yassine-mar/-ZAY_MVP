'use strict';

const { db } = require('../../src/config/database');

const seedOrder = async ({
  customerId,
  sellerId,
  status = 'pending',
  totalAmount = 130,
  paymentMethod = 'cash',
  deliveryAddress = {
    street: '12 Rue Hassan II',
    district: 'Maârif',
    city: 'Casablanca',
    landmark: 'Facing Carrefour',
    notes: '2nd floor',
  },
  customerNotes = null,
  idempotencyKey = null,
} = {}) => {
  const result = await db.query(
    `INSERT INTO orders
       (id, customer_id, seller_id, status, total_amount,
        payment_method, delivery_address, customer_notes, idempotency_key)
     VALUES
       (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [customerId, sellerId, status, totalAmount, paymentMethod,
      JSON.stringify(deliveryAddress), customerNotes, idempotencyKey]
  );
  return result.rows[0];
};

const seedOrderItem = async ({
  orderId,
  menuItemId,
  name = 'Tagine Poulet',
  price = 65,
  quantity = 2,
  imageUrl = null,
}) => {
  const subtotal = price * quantity;
  const result = await db.query(
    `INSERT INTO order_items
       (id, order_id, menu_item_id, name, price, quantity, subtotal, image_url)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [orderId, menuItemId, name, price, quantity, subtotal, imageUrl]
  );
  return result.rows[0];
};

const truncateOrderTables = async () => {
  // CASCADE drops dependent rows: order_items + order_status_history
  // (notifications.order_id is SET NULL, but truncating notifications too keeps tests clean).
  await db.query(
    'TRUNCATE TABLE notifications, order_status_history, order_items, orders RESTART IDENTITY CASCADE'
  );
};

module.exports = {
  seedOrder,
  seedOrderItem,
  truncateOrderTables,
};
