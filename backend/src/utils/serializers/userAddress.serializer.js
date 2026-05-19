'use strict';

const serializeAddress = (address) => {
  if (!address) return null;
  return {
    id: address.id,
    label: address.label,
    street: address.street,
    district: address.district,
    city: address.city,
    landmark: address.landmark,
    notes: address.notes,
    is_default: address.is_default,
    created_at: address.created_at,
    updated_at: address.updated_at,
  };
};

module.exports = { serializeAddress };
