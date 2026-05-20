-- Migration 015: order lifecycle timestamps trigger.
--
-- When an order's status changes, automatically set the corresponding
-- lifecycle timestamp if it hasn't already been set. The service can
-- still set them explicitly (e.g., setting estimated_ready_at on accept)
-- — this trigger handles the default case.
--
-- Status history rows are managed by the service explicitly (see 013).
-- This trigger ONLY handles lifecycle timestamps on orders.

CREATE OR REPLACE FUNCTION fn_orders_set_lifecycle_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' AND NEW.accepted_at IS NULL THEN
      NEW.accepted_at = NOW();
    ELSIF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
      NEW.delivered_at = NOW();
    ELSIF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_set_lifecycle_timestamps
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_orders_set_lifecycle_timestamps();

COMMENT ON FUNCTION fn_orders_set_lifecycle_timestamps IS
  'Auto-sets accepted_at, delivered_at, cancelled_at when status transitions';
