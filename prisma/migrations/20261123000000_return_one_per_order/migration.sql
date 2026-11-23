-- Enforce one return request per order at the database level.
-- This closes a race in POST /api/returns where two near-simultaneous submits
-- (double click / two tabs / retry) could each create a ReturnRequest for the
-- same order, and each could later be refunded for the full order total.

-- 1) Clean up any duplicate return requests that the race may already have created,
--    keeping the earliest one per order (lowest createdAt, then lowest id as a tiebreak).
--    Without this step, creating the unique index below would fail if duplicates exist.
DELETE FROM "ReturnRequest" a
USING "ReturnRequest" b
WHERE a."orderId" = b."orderId"
  AND (
    a."createdAt" > b."createdAt"
    OR (a."createdAt" = b."createdAt" AND a."id" > b."id")
  );

-- 2) Replace the non-unique orderId index with a unique one.
DROP INDEX "ReturnRequest_orderId_idx";
CREATE UNIQUE INDEX "ReturnRequest_orderId_key" ON "ReturnRequest"("orderId");
