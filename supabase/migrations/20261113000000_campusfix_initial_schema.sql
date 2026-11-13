-- CampusFix / Team 6
-- Initial database schema for a NEW Supabase project only.
-- DO NOT execute on the existing production database: objects already exist.
-- Contains schema, constraints, the exported trigger function, and exported RLS policies.
-- No user accounts, staff membership records, or report data are exported.
--
-- The reports_resolution_consistency CHECK was reconstructed with equivalent
-- 10-2000 character semantics because its full definition was truncated in
-- the supplied constraint screenshot. Confirm exact original before calling
-- this a byte-for-byte schema backup.

-- 1. Tables and constraints
CREATE TABLE public.staff_members (
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT staff_members_pkey PRIMARY KEY (user_id),
    CONSTRAINT staff_members_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.reports (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    location text NOT NULL,
    description text NOT NULL,
    status text NOT NULL DEFAULT 'Submitted'::text,
    resolution text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT reports_pkey PRIMARY KEY (id),
    CONSTRAINT reports_reporter_id_fkey
        FOREIGN KEY (reporter_id) REFERENCES auth.users(id),
    CONSTRAINT title_length
        CHECK (char_length(btrim(title)) BETWEEN 5 AND 100),
    CONSTRAINT description_length
        CHECK (char_length(btrim(description)) BETWEEN 10 AND 2000),
    CONSTRAINT reports_status_check
        CHECK (status = ANY (ARRAY['Submitted'::text, 'In Progress'::text, 'Resolved'::text])),
    CONSTRAINT reports_resolution_consistency
        CHECK (
            (status <> 'Resolved'::text AND resolution IS NULL)
            OR
            (status = 'Resolved'::text
                AND resolution IS NOT NULL
                AND char_length(btrim(resolution)) BETWEEN 10 AND 2000)
        )
);

-- 2. Original trigger function, copied from the Supabase CSV export
CREATE OR REPLACE FUNCTION public.enforce_report_workflow()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN

  -- 已結案的通報不得重新開啟或修改處理結果
  IF OLD.status = 'Resolved'
     AND (
       NEW.status IS DISTINCT FROM OLD.status
       OR NEW.resolution IS DISTINCT FROM OLD.resolution
     )
  THEN
    RAISE EXCEPTION
      'Resolved reports cannot be modified'
      USING ERRCODE = '23514';
  END IF;

  -- 只允許指定的狀態轉換
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'Submitted'
       AND NEW.status = 'In Progress')
      OR
      (OLD.status = 'In Progress'
       AND NEW.status = 'Resolved')
    ) THEN
      RAISE EXCEPTION
        'Invalid status transition: % to %',
        OLD.status, NEW.status
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- 結案必須填寫有效的處理說明
  IF NEW.status = 'Resolved' THEN
    IF NEW.resolution IS NULL
       OR char_length(btrim(NEW.resolution))
          NOT BETWEEN 10 AND 2000
    THEN
      RAISE EXCEPTION
        'Resolution must contain 10 to 2000 characters'
        USING ERRCODE = '23514';
    END IF;

  -- 尚未結案時，不允許預先填入處理結果
  ELSIF NEW.resolution IS NOT NULL THEN
    RAISE EXCEPTION
      'Resolution is only allowed for resolved reports'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Status / resolution trigger
CREATE TRIGGER check_report_workflow
BEFORE UPDATE OF status, resolution ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.enforce_report_workflow();

-- 4. Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reports"
ON public.reports
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can submit their own reports"
ON public.reports
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
    reporter_id = (SELECT auth.uid())
    AND status = 'Submitted'::text
    AND resolution IS NULL
);

CREATE POLICY "Staff can update report progress"
ON public.reports
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.staff_members s
        WHERE s.user_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.staff_members s
        WHERE s.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Staff can view own membership"
ON public.staff_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- 5. Permissions needed for the app's authenticated Supabase client.
--    RLS remains responsible for row-level authorization.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.reports TO authenticated;
GRANT SELECT ON TABLE public.staff_members TO authenticated;

-- Staff membership provisioning must be done by an administrator (e.g. SQL Editor)
-- after the corresponding user exists in auth.users. Never add service keys
-- or production user information to this migration.
