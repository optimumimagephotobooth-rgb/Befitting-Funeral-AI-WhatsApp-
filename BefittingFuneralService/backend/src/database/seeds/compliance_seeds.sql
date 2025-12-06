WITH template AS (
  INSERT INTO compliance_templates (name, jurisdiction, facility_type, version, metadata)
  VALUES ('Act 563 Default', 'Ghana', 'funeral_home', 'v1', '{}'::jsonb)
  ON CONFLICT (name, version) DO UPDATE SET updated_at = now()
  RETURNING id
)
INSERT INTO compliance_template_items (
  template_id,
  category,
  item_key,
  description,
  required_stage,
  is_required,
  default_sla_hours,
  requires_evidence,
  metadata,
  sort_order
)
SELECT
  t.id,
  defs.category,
  defs.item_key,
  defs.description,
  defs.required_stage,
  defs.is_required,
  defs.sla_hours,
  defs.requires_evidence,
  '{}'::jsonb,
  defs.sort_order
FROM template t
CROSS JOIN (
  VALUES
    ('Licensing & Registration', 'facility_license', 'Verify facility license validity', 'NEW', true, 72, false, 1),
    ('Record Keeping', 'case_register', 'Ensure case entry in official register', 'NEW', true, 24, false, 2),
    ('Removal', 'removal_authorization', 'Confirm removal permit uploaded & validated before transport', 'INTAKE', true, 2, true, 3),
    ('Transport', 'transport_log', 'Record vehicle, driver, route, departure & arrival', 'SCHEDULED', true, 3, true, 4),
    ('Storage', 'storage_entry', 'Log body into storage register within 24h', 'DOCUMENTS', true, 24, false, 5),
    ('Health & Sanitation', 'sanitation_check', 'Complete daily sanitation checklist', 'ANY', true, 24, false, 6),
    ('Burial/Cremation', 'burial_permit', 'Verify burial or cremation permit before service day', 'SERVICE_DAY', true, 12, true, 7),
    ('Care & Handling', 'care_log', 'Document embalming/prep steps', 'SERVICE_DAY', false, 24, 8)
) AS defs(category, item_key, description, required_stage, is_required, sla_hours, requires_evidence, sort_order);

WITH template AS (
  SELECT id FROM compliance_templates WHERE name = 'Act 563 Default' AND version = 'v1' LIMIT 1
)
INSERT INTO compliance_template_documents (
  template_id,
  document_type,
  label,
  required_stage,
  is_required,
  sla_hours,
  requires_evidence,
  metadata,
  sort_order
)
SELECT
  t.id,
  defs.document_type,
  defs.label,
  defs.required_stage,
  defs.is_required,
  defs.sla_hours,
  defs.requires_evidence,
  '{}'::jsonb,
  defs.sort_order
FROM template t
CROSS JOIN (
  VALUES
    ('removal_authorization', 'Removal Authorization Permit', 'INTAKE', true, 2, true, 1),
    ('body_identification_record', 'Body Identification Record', 'INTAKE', true, 12, false, 2),
    ('transport_log', 'Transport Log', 'SCHEDULED', true, 3, true, 3),
    ('storage_register_entry', 'Storage Register Entry', 'DOCUMENTS', true, 24, false, 4),
    ('burial_permit', 'Burial/Cremation Permit', 'SERVICE_DAY', true, 12, true, 5),
    ('next_of_kin_form', 'Next of Kin Information', 'INTAKE', true, 24, false, 6),
    ('internal_care_log', 'Internal Care Log', 'SERVICE_DAY', false, 24, 7)
) AS defs(document_type, label, required_stage, is_required, sla_hours, requires_evidence, sort_order);


