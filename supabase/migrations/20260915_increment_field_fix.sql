-- Fix increment_field: the function was defined with 3 params but every
-- caller (webhook DM counts, bio click/view tracking) passes increment_by —
-- PostgREST couldn't match the signature, so ALL increments have been
-- silently failing (404 PGRST202). Also lock the SECURITY DEFINER function
-- to the service role only — it was executable by anon/authenticated, so
-- anyone could have skewed any counter via the REST endpoint directly.

CREATE OR REPLACE FUNCTION public.increment_field(
  table_name text,
  field_name text,
  row_id uuid,
  increment_by integer DEFAULT 1
)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.%I SET %I = COALESCE(%I, 0) + $2 WHERE id = $1',
    table_name,
    field_name,
    field_name
  )
  USING row_id, increment_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.increment_field(text, text, uuid, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_field(text, text, uuid, integer) TO service_role;
-- also revoke the old 3-arg signature if it lingers
REVOKE ALL ON FUNCTION public.increment_field(text, text, uuid) FROM anon, authenticated;
