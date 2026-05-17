-- 012_create_triggers.sql
-- Cross-cutting database triggers

-- ── updated_at auto-update ─────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_sp_updated_at BEFORE UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_menus_updated_at BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_mi_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── Order lifecycle timestamps ─────────────────────────────────
CREATE OR REPLACE FUNCTION fn_orders_set_lifecycle_timestamps() RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'accepted' AND NEW.accepted_at IS NULL THEN
      NEW.accepted_at := NOW();
    ELSIF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
      NEW.delivered_at := NOW();
    ELSIF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_lifecycle
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_orders_set_lifecycle_timestamps();

-- ── Order status history (append-only audit) ───────────────────
CREATE OR REPLACE FUNCTION fn_orders_log_status_history() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_at)
    VALUES (NEW.id, NULL, NEW.status, NOW());
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, note, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.cancellation_note, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_status_history_insert
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_orders_log_status_history();

CREATE TRIGGER trg_orders_status_history_update
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_orders_log_status_history();
