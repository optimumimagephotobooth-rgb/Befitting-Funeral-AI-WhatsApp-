-- Supabase tenant-aware schema for Befitting Funeral Management

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'agent',
  phone TEXT UNIQUE,
  password_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,
  mfa_method TEXT DEFAULT 'sms',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_mfa_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id);

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contact_id UUID REFERENCES contacts(id),
  case_ref TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'NEW',
  stage TEXT NOT NULL DEFAULT 'NEW',
  deceased_name TEXT,
  funeral_date DATE,
  location TEXT,
  package_name TEXT,
  total_amount NUMERIC,
  deposit_amount NUMERIC,
  compliance_template_id UUID REFERENCES compliance_templates(id),
  compliance_template_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cases_tenant ON cases(tenant_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  case_id UUID REFERENCES cases(id),
  direction TEXT NOT NULL,
  from_number TEXT,
  body TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_case ON messages(case_id);

CREATE TABLE IF NOT EXISTS case_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  case_id UUID REFERENCES cases(id),
  author TEXT NOT NULL CHECK (author IN ('ai', 'staff')),
  type TEXT NOT NULL CHECK (type IN ('obituary', 'announcement', 'summary', 'family_message')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  reviewer_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_messages_case ON case_messages(case_id);
CREATE INDEX IF NOT EXISTS idx_case_messages_tenant ON case_messages(tenant_id);

ALTER TABLE case_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_messages_tenant_match ON case_messages
  FOR ALL
  USING (tenant_id::text = auth.jwt() ->> 'tenant_id')
  WITH CHECK (tenant_id::text = auth.jwt() ->> 'tenant_id');


CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  description TEXT,
  html_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES staff(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_document_templates_tenant ON document_templates(tenant_id);

CREATE TABLE IF NOT EXISTS case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  template_id UUID REFERENCES document_templates(id),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  html_snapshot TEXT,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_case_documents_case ON case_documents(case_id);

CREATE TABLE IF NOT EXISTS case_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  category TEXT,
  created_by UUID REFERENCES staff(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_charges_case ON case_charges(case_id);

CREATE TABLE IF NOT EXISTS case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_notes_case ON case_notes(case_id);

CREATE TABLE IF NOT EXISTS forecast_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  level TEXT NOT NULL,
  summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forecast_events_case ON forecast_events(case_id);

CREATE TABLE IF NOT EXISTS automation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  alert_key TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  recommended_action TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES staff(id),
  sla_due_at TIMESTAMPTZ,
  breached_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_automation_alerts_case ON automation_alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_automation_alerts_status ON automation_alerts(status);

CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  sla_due_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES staff(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES staff(id),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_case ON compliance_alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON compliance_alerts(status);

CREATE TABLE IF NOT EXISTS compliance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  jurisdiction TEXT,
  facility_type TEXT,
  version TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now,
  updated_at TIMESTAMPTZ DEFAULT now,
  UNIQUE (name, version)
);

CREATE TABLE IF NOT EXISTS compliance_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES compliance_templates(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_key TEXT NOT NULL,
  description TEXT,
  required_stage TEXT,
  is_required BOOLEAN DEFAULT true,
  default_sla_hours INTEGER,
  requires_evidence BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_template_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES compliance_templates(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  label TEXT,
  required_stage TEXT,
  is_required BOOLEAN DEFAULT true,
  sla_hours INTEGER,
  requires_evidence BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS funeral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','DELAYED')),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funeral_events_case_seq ON funeral_events(case_id, sequence_order);

CREATE TABLE IF NOT EXISTS funeral_event_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES funeral_events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DONE','SKIPPED')),
  assigned_staff_id UUID REFERENCES staff(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funeral_event_tasks_event ON funeral_event_tasks(event_id);

CREATE TABLE IF NOT EXISTS funeral_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  staff_id UUID REFERENCES staff(id),
  name_override TEXT,
  contact_phone TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funeral_staff_assignments_case ON funeral_staff_assignments(case_id);

CREATE TABLE IF NOT EXISTS funeral_vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  vehicle_label TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  from_location TEXT,
  to_location TEXT,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funeral_vehicle_assignments_case ON funeral_vehicle_assignments(case_id);

CREATE TABLE IF NOT EXISTS funeral_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  venue_type TEXT NOT NULL,
  name TEXT,
  address TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funeral_venues_case ON funeral_venues(case_id);

CREATE TABLE IF NOT EXISTS funeral_venue_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES funeral_venues(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DONE','SKIPPED')),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funeral_venue_checklist_items_venue ON funeral_venue_checklist_items(venue_id);
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subtype TEXT,
  condition_status TEXT DEFAULT 'GOOD' CHECK (condition_status IN ('GOOD','FAIR','NEEDS_REPAIR','DAMAGED')),
  is_available BOOLEAN DEFAULT true,
  return_status TEXT DEFAULT 'with_staff' CHECK (return_status IN ('with_staff','return_to_base','returned','lost')),
  usage_logs JSONB DEFAULT '[]'::JSONB,
  quantity INT DEFAULT 1,
  unit_cost NUMERIC(14,2),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DAMAGED','RETIRED')),
  metadata JSONB DEFAULT '{}'::JSONB,
  license_plate TEXT,
  mileage INT DEFAULT 0,
  last_service_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_subtype ON inventory_items(subtype);
CREATE INDEX IF NOT EXISTS idx_inventory_items_available ON inventory_items(is_available);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  reserved_quantity INT NOT NULL,
  reserved_from TIMESTAMPTZ,
  reserved_to TIMESTAMPTZ,
  status TEXT DEFAULT 'RESERVED' CHECK (status IN ('RESERVED','CHECKED_OUT','RETURNED')),
  created_by UUID REFERENCES staff(id),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_case ON inventory_reservations(case_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_item ON inventory_reservations(item_id);

CREATE TABLE IF NOT EXISTS inventory_checkout_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES inventory_reservations(id) ON DELETE CASCADE,
  checked_out_by UUID REFERENCES staff(id),
  checked_in_by UUID REFERENCES staff(id),
  checked_out_at TIMESTAMPTZ DEFAULT now(),
  checked_in_at TIMESTAMPTZ,
  condition_out TEXT,
  condition_in TEXT,
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_inventory_checkout_log_reservation ON inventory_checkout_log(reservation_id);

CREATE TABLE IF NOT EXISTS equipment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id),
  assigned_from TIMESTAMPTZ NOT NULL,
  assigned_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated','in_use','returned','overdue','damaged')),
  return_condition TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_allocations_case ON equipment_allocations(case_id);
CREATE INDEX IF NOT EXISTS idx_equipment_allocations_item ON equipment_allocations(item_id);

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_tenant_category_name ON vendors (tenant_id, category, name);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  type TEXT NOT NULL DEFAULT 'tombstone_installation',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','delayed','completed')),
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'::JSONB,
  deposit_receipt_url TEXT,
  certificate_url TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_case ON work_orders(case_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vendor ON work_orders(vendor_id);

CREATE TABLE IF NOT EXISTS mortuary_bodies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  name TEXT,
  sex TEXT,
  age INT,
  condition_notes TEXT,
  intake_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'IN_STORAGE' CHECK (status IN ('IN_STORAGE','IN_PREP','RELEASED')),
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE TABLE IF NOT EXISTS mortuary_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_id UUID REFERENCES mortuary_bodies(id) ON DELETE CASCADE,
  slot_number TEXT,
  stored_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mortuary_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_id UUID REFERENCES mortuary_bodies(id) ON DELETE CASCADE,
  from_area TEXT,
  to_area TEXT,
  moved_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS cemetery_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT,
  row TEXT,
  plot_number TEXT,
  status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','RESERVED','OCCUPIED','CLOSED')),
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cemetery_plot_unique ON cemetery_plots(section, row, plot_number);

CREATE TABLE IF NOT EXISTS burial_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES cemetery_plots(id),
  burial_time TIMESTAMPTZ,
  workers JSONB DEFAULT '[]'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  otp TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_portal_tokens_case_unique ON family_portal_tokens(case_id);

CREATE TABLE IF NOT EXISTS family_payment_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference TEXT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_payment_uploads_case ON family_payment_uploads(case_id);
CREATE TABLE IF NOT EXISTS compliance_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_key TEXT NOT NULL,
  description TEXT,
  required_stage TEXT,
  is_required BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','waived')),
  notes TEXT,
  completed_by UUID REFERENCES staff(id),
  completed_at TIMESTAMPTZ,
  waived_by UUID REFERENCES staff(id),
  waived_at TIMESTAMPTZ,
  waived_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_checklist_case ON compliance_checklist_items(case_id);

CREATE TABLE IF NOT EXISTS required_documents_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  label TEXT,
  required_stage TEXT,
  is_required BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','verified','rejected','waived')),
  file_id UUID REFERENCES case_documents(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sla_due_at TIMESTAMPTZ,
  verified_by UUID REFERENCES staff(id),
  verified_at TIMESTAMPTZ,
  waived_by UUID REFERENCES staff(id),
  waived_at TIMESTAMPTZ,
  waived_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_required_documents_unique ON required_documents_status(case_id, document_type);

CREATE TABLE IF NOT EXISTS transport_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  vehicle_id TEXT,
  driver_name TEXT,
  route TEXT,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_logs_case ON transport_logs(case_id);

CREATE TABLE IF NOT EXISTS sanitation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES tenants(id),
  performed_by UUID REFERENCES staff(id),
  checklist JSONB,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','escalated')),
  performed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sanitation_logs_facility ON sanitation_logs(facility_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id),
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_case ON audit_log(case_id);





