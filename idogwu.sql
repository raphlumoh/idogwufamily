-- ============================================================
-- IDOGWU FAMILY DATABASE
-- MASTER DATABASE SECURITY & ADMIN ROLE SCRIPT
-- ============================================================
--
-- PURPOSE:
-- 1. Create/prepare user_roles
-- 2. Create secure admin-checking function
-- 3. Configure administrator permissions
-- 4. Allow authenticated users to VIEW members
-- 5. Allow administrators to ADD members
-- 6. Allow administrators to EDIT members
-- 7. Allow administrators to DELETE members
-- 8. Secure idogwu_payments
--
-- IMPORTANT:
-- This script does NOT delete existing member records.
-- This script does NOT delete Supabase Auth users.
-- ============================================================


-- ============================================================
-- 1. USER ROLES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id uuid PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    role text NOT NULL DEFAULT 'member',

    username text
);


-- Make sure the username column exists
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS username text;


-- Make sure role values are valid
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_role_check;


ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_role_check
CHECK (role IN ('admin', 'member'));


-- Indexes
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx
ON public.user_roles(user_id);


CREATE INDEX IF NOT EXISTS user_roles_role_idx
ON public.user_roles(role);



-- ============================================================
-- 2. ADMIN CHECK FUNCTION
-- ============================================================
--
-- This function checks whether the currently logged-in
-- Supabase user has the "admin" role.
--
-- SECURITY DEFINER prevents RLS recursion when checking
-- the user_roles table.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = (SELECT auth.uid())
          AND role = 'admin'
    );
$$;


REVOKE ALL
ON FUNCTION public.is_admin()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.is_admin()
TO authenticated;



-- ============================================================
-- 3. SECURE USER_ROLES TABLE
-- ============================================================

ALTER TABLE public.user_roles
ENABLE ROW LEVEL SECURITY;


REVOKE ALL
ON TABLE public.user_roles
FROM anon;


REVOKE ALL
ON TABLE public.user_roles
FROM authenticated;


GRANT SELECT
ON TABLE public.user_roles
TO authenticated;


-- Remove old policies created by this security setup
DROP POLICY IF EXISTS "Users can view their own role"
ON public.user_roles;

DROP POLICY IF EXISTS "Admins can view all roles"
ON public.user_roles;

DROP POLICY IF EXISTS "Admins can insert roles"
ON public.user_roles;

DROP POLICY IF EXISTS "Admins can update roles"
ON public.user_roles;

DROP POLICY IF EXISTS "Admins can delete roles"
ON public.user_roles;


-- Users can see their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


-- Administrators can see all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_admin())
);


-- Administrators can create roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT public.is_admin())
);


-- Administrators can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
    (SELECT public.is_admin())
)
WITH CHECK (
    (SELECT public.is_admin())
);


-- Administrators can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
    (SELECT public.is_admin())
);



-- ============================================================
-- 4. IDOGWU MEMBERS TABLE
-- ============================================================

ALTER TABLE public.idogwu_members
ENABLE ROW LEVEL SECURITY;


-- Remove public/anonymous table access
REVOKE ALL
ON TABLE public.idogwu_members
FROM anon;


-- Authenticated users need SELECT
GRANT SELECT
ON TABLE public.idogwu_members
TO authenticated;


-- Authenticated users technically have table privileges,
-- but RLS below restricts INSERT/UPDATE/DELETE to admins.
GRANT INSERT, UPDATE, DELETE
ON TABLE public.idogwu_members
TO authenticated;


-- Remove previous policies that may conflict
DROP POLICY IF EXISTS "Allow public select"
ON public.idogwu_members;

DROP POLICY IF EXISTS "Allow public insert"
ON public.idogwu_members;

DROP POLICY IF EXISTS "Allow public update"
ON public.idogwu_members;

DROP POLICY IF EXISTS "Allow public delete"
ON public.idogwu_members;

DROP POLICY IF EXISTS "Authenticated users can view members"
ON public.idogwu_members;

DROP POLICY IF EXISTS "Admins can select members"
ON public.idogwu_members;

DROP POLICY IF EXISTS "Admins can insert members"
ON public.idogwu_members;

DROP POLICY IF EXISTS "Admins can update members"
ON public.idogwu_members;

DROP POLICY IF EXISTS "Admins can delete members"
ON public.idogwu_members;


-- ============================================================
-- 5. MEMBER VIEW PERMISSION
-- ============================================================
--
-- Any authenticated/logged-in user can view the database.
-- Nobody who is not logged in can view it.
-- ============================================================

CREATE POLICY "Authenticated users can view members"
ON public.idogwu_members
FOR SELECT
TO authenticated
USING (
    true
);



-- ============================================================
-- 6. ADMIN INSERT PERMISSION
-- ============================================================

CREATE POLICY "Admins can insert members"
ON public.idogwu_members
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT public.is_admin())
);



-- ============================================================
-- 7. ADMIN UPDATE PERMISSION
-- ============================================================

CREATE POLICY "Admins can update members"
ON public.idogwu_members
FOR UPDATE
TO authenticated
USING (
    (SELECT public.is_admin())
)
WITH CHECK (
    (SELECT public.is_admin())
);



-- ============================================================
-- 8. ADMIN DELETE PERMISSION
-- ============================================================

CREATE POLICY "Admins can delete members"
ON public.idogwu_members
FOR DELETE
TO authenticated
USING (
    (SELECT public.is_admin())
);



-- ============================================================
-- 9. ADMINISTRATOR ACCOUNT
-- ============================================================
--
-- Current administrator:
--
-- User ID:
-- 290d71fa-111d-43e2-afea-b681eaf91d06
--
-- Username:
-- idogwuadmin
-- ============================================================

INSERT INTO public.user_roles (
    user_id,
    role,
    username
)
VALUES (
    '290d71fa-111d-43e2-afea-b681eaf91d06',
    'admin',
    'idogwuadmin'
)
ON CONFLICT (user_id)
DO UPDATE SET
    role = 'admin',
    username = 'idogwuadmin';



-- ============================================================
-- 10. IDOGWU PAYMENTS TABLE
-- ============================================================

ALTER TABLE public.idogwu_payments
ENABLE ROW LEVEL SECURITY;


REVOKE ALL
ON TABLE public.idogwu_payments
FROM anon;


GRANT SELECT
ON TABLE public.idogwu_payments
TO authenticated;


GRANT INSERT, UPDATE, DELETE
ON TABLE public.idogwu_payments
TO authenticated;


-- Remove previous policies
DROP POLICY IF EXISTS "Authenticated users can view payments"
ON public.idogwu_payments;

DROP POLICY IF EXISTS "Admins can insert payments"
ON public.idogwu_payments;

DROP POLICY IF EXISTS "Admins can update payments"
ON public.idogwu_payments;

DROP POLICY IF EXISTS "Admins can delete payments"
ON public.idogwu_payments;


-- Logged-in users can view payments
CREATE POLICY "Authenticated users can view payments"
ON public.idogwu_payments
FOR SELECT
TO authenticated
USING (
    true
);


-- Admins can add payments
CREATE POLICY "Admins can insert payments"
ON public.idogwu_payments
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT public.is_admin())
);


-- Admins can edit payments
CREATE POLICY "Admins can update payments"
ON public.idogwu_payments
FOR UPDATE
TO authenticated
USING (
    (SELECT public.is_admin())
)
WITH CHECK (
    (SELECT public.is_admin())
);


-- Admins can delete payments
CREATE POLICY "Admins can delete payments"
ON public.idogwu_payments
FOR DELETE
TO authenticated
USING (
    (SELECT public.is_admin())
);



-- ============================================================
-- 11. VERIFICATION
-- ============================================================
--
-- Check the current administrator.
-- ============================================================

SELECT
    user_id,
    role,
    username
FROM public.user_roles
WHERE user_id =
    '290d71fa-111d-43e2-afea-b681eaf91d06';



-- ============================================================
-- 12. CHECK ALL ADMINISTRATORS
-- ============================================================

SELECT
    user_id,
    role,
    username
FROM public.user_roles
WHERE role = 'admin'
ORDER BY username;



-- ============================================================
-- END OF IDOGWU FAMILY DATABASE MASTER SECURITY SCRIPT
-- ============================================================