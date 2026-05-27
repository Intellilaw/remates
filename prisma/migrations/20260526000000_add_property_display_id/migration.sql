ALTER TABLE "properties" ADD COLUMN "display_id" TEXT;

WITH numbered_properties AS (
  SELECT
    id,
    'Inmueble ' || LPAD(ROW_NUMBER() OVER (ORDER BY published_at ASC NULLS LAST, id ASC)::TEXT, 3, '0') AS display_id
  FROM "properties"
)
UPDATE "properties"
SET "display_id" = numbered_properties.display_id
FROM numbered_properties
WHERE "properties".id = numbered_properties.id;

ALTER TABLE "properties" ALTER COLUMN "display_id" SET NOT NULL;

CREATE UNIQUE INDEX "properties_display_id_key" ON "properties"("display_id");
