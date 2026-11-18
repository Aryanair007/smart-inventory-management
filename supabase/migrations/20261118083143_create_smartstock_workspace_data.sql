/*
# Create SmartStock workspace data

1. New Tables
- `inventory_items` stores the shared warehouse catalog, stock counts, thresholds, locations, and current status used by Overview and Inventory.
- `warehouse_activity` stores recent receiving, dispatch, and audit events shown in the workspace feed.

2. Security
- Both tables use row level security.
- This is a single shared workspace with no sign-in flow in this build, so anon and authenticated roles can read and update the intentionally shared operational data.
- CRUD grants are limited to the verbs used by the dashboard.

3. Important Notes
- Seed rows are inserted only when the tables are empty, so refreshes do not duplicate activity or inventory.
- No existing tables or user data are changed.
*/

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  location text NOT NULL DEFAULT 'Main warehouse',
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level integer NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  status text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warehouse_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('received', 'dispatched', 'audit', 'alert')),
  title text NOT NULL,
  detail text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_activity ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_activity TO anon, authenticated;

DROP POLICY IF EXISTS "shared_read_inventory_items" ON public.inventory_items;
CREATE POLICY "shared_read_inventory_items" ON public.inventory_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_inventory_items" ON public.inventory_items;
CREATE POLICY "shared_insert_inventory_items" ON public.inventory_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_inventory_items" ON public.inventory_items;
CREATE POLICY "shared_update_inventory_items" ON public.inventory_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_inventory_items" ON public.inventory_items;
CREATE POLICY "shared_delete_inventory_items" ON public.inventory_items FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_read_warehouse_activity" ON public.warehouse_activity;
CREATE POLICY "shared_read_warehouse_activity" ON public.warehouse_activity FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_warehouse_activity" ON public.warehouse_activity;
CREATE POLICY "shared_insert_warehouse_activity" ON public.warehouse_activity FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_warehouse_activity" ON public.warehouse_activity;
CREATE POLICY "shared_update_warehouse_activity" ON public.warehouse_activity FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_warehouse_activity" ON public.warehouse_activity;
CREATE POLICY "shared_delete_warehouse_activity" ON public.warehouse_activity FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS inventory_items_status_idx ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS warehouse_activity_created_at_idx ON public.warehouse_activity(created_at DESC);

INSERT INTO public.inventory_items (sku, name, category, location, quantity, reorder_level, unit_price, status)
SELECT * FROM (VALUES
  ('FUR-8831', 'Pro Ergonomic Chair', 'Furniture', 'Rack B-04', 4, 20, 249.00, 'low_stock'),
  ('ACC-1092', 'Mechanical Keyboard RGB', 'Accessories', 'Zone C-12', 0, 12, 129.00, 'out_of_stock'),
  ('ELE-4401', 'USB-C Multiport Dock 12-in-1', 'Electronics', 'Secondary Depot', 7, 10, 89.00, 'low_stock'),
  ('MON-2210', 'Ultra-Wide Monitor 34 inch', 'Displays', 'Bin A-14', 56, 18, 499.00, 'in_stock'),
  ('AUD-0918', 'Wireless Headset Pro', 'Audio', 'Dock 3', 32, 15, 179.00, 'in_stock'),
  ('MAT-7740', 'Ergonomic Desk Mat', 'Workspace', 'Bin C-02', 18, 10, 39.00, 'in_stock')
) AS seed(sku, name, category, location, quantity, reorder_level, unit_price, status)
WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items);

INSERT INTO public.warehouse_activity (action, title, detail, quantity)
SELECT * FROM (VALUES
  ('received', 'Stock Count Checked!', 'Maria from Floor 2 • Verified', 150),
  ('audit', 'PO #PO-9402 Approved!', 'David from Procurement • 2 suppliers', 0),
  ('alert', 'Low Stock Alert!', 'Shelf Bot • Needs attention', 12),
  ('dispatched', 'Outbound shipment dispatched', 'Dock 3 • Carrier pickup complete', 42)
) AS seed(action, title, detail, quantity)
WHERE NOT EXISTS (SELECT 1 FROM public.warehouse_activity);