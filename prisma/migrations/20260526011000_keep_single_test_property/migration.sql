CREATE TEMP TABLE "_obsolete_property_ids" (
  "id" TEXT PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO "_obsolete_property_ids" ("id")
SELECT "id"
FROM "properties"
WHERE "id" IN (
  'prop_polanco_001',
  'prop_delvalle_002',
  'prop_coyoacan_003',
  'prop_narvarte_004',
  'prop_condesa_005',
  'prop_6ca1d2370eca4fdab78a28feacfcca2b',
  'prop_test_single_001'
)
OR "slug" IN (
  'departamento-polanco-horacio',
  'departamento-del-valle-norte',
  'casa-coyoacan-santa-catarina',
  'departamento-narvarte-poniente',
  'departamento-condesa-amsterdam',
  'remate-prueba-automatizada',
  'inmueble-prueba-controlado',
  'inmueble-prueba-controlado-cdmx'
)
OR "slug" LIKE 'prueba-flujo-movil-%'
OR "title" ILIKE 'Prueba flujo movil%';

CREATE TEMP TABLE "_obsolete_case_ids" (
  "id" TEXT PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO "_obsolete_case_ids" ("id")
SELECT "id"
FROM "cases"
WHERE "property_id" IN (SELECT "id" FROM "_obsolete_property_ids");

CREATE TEMP TABLE "_obsolete_conversation_ids" (
  "id" TEXT PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO "_obsolete_conversation_ids" ("id")
SELECT "id"
FROM "conversations"
WHERE "case_id" IN (SELECT "id" FROM "_obsolete_case_ids");

DELETE FROM "messages"
WHERE "conversation_id" IN (SELECT "id" FROM "_obsolete_conversation_ids");

DELETE FROM "conversation_participants"
WHERE "conversation_id" IN (SELECT "id" FROM "_obsolete_conversation_ids");

DELETE FROM "conversations"
WHERE "id" IN (SELECT "id" FROM "_obsolete_conversation_ids");

DELETE FROM "internal_notes"
WHERE "case_id" IN (SELECT "id" FROM "_obsolete_case_ids");

DELETE FROM "payments"
WHERE "case_id" IN (SELECT "id" FROM "_obsolete_case_ids");

DELETE FROM "case_events"
WHERE "case_id" IN (SELECT "id" FROM "_obsolete_case_ids");

DELETE FROM "conversion_events"
WHERE "property_id" IN (SELECT "id" FROM "_obsolete_property_ids")
   OR "case_id" IN (SELECT "id" FROM "_obsolete_case_ids");

DELETE FROM "cases"
WHERE "id" IN (SELECT "id" FROM "_obsolete_case_ids");

DELETE FROM "property_private_details"
WHERE "property_id" IN (SELECT "id" FROM "_obsolete_property_ids");

DELETE FROM "property_media"
WHERE "property_id" IN (SELECT "id" FROM "_obsolete_property_ids");

DELETE FROM "properties"
WHERE "id" IN (SELECT "id" FROM "_obsolete_property_ids");

DELETE FROM "visitor_sessions"
WHERE "id" = 'visit_demo_001';

INSERT INTO "properties" (
  "id",
  "display_id",
  "slug",
  "title",
  "state",
  "city",
  "zone_label",
  "estimated_value_mxn",
  "legal_bid_mxn",
  "discount_pct",
  "auction_round",
  "short_description",
  "public_status",
  "featured",
  "tags",
  "hero_tone",
  "image_accent",
  "published_at"
)
VALUES (
  'prop_test_single_001',
  'Prueba 001',
  'inmueble-prueba-controlado-cdmx',
  'Inmueble de prueba',
  'Ciudad de México',
  'Benito Juárez',
  'Narvarte Poniente',
  4200000,
  2940000,
  30,
  'PRIMERA',
  'Ficha única de prueba para validar el comportamiento del catálogo y el flujo de detalle.',
  'PUBLISHED',
  TRUE,
  ARRAY['Prueba', 'CDMX', 'Validación']::TEXT[],
  'cobalt',
  '#2563eb',
  '2026-05-26T21:00:00.000Z'::TIMESTAMPTZ
);

INSERT INTO "property_private_details" (
  "property_id",
  "full_address",
  "court_name",
  "auction_date",
  "auction_time",
  "occupancy_status",
  "legal_summary",
  "risk_notes"
)
VALUES (
  'prop_test_single_001',
  'Calle de prueba 123, Narvarte Poniente, Benito Juárez, Ciudad de México',
  'Juzgado de prueba para validación interna',
  '2026-06-15'::DATE,
  '10:30',
  'Por confirmar',
  'Registro temporal usado únicamente para revisar el comportamiento de la página.',
  'No usar esta ficha para operación comercial. Debe reemplazarse por un inmueble real antes de publicar formalmente.'
);
