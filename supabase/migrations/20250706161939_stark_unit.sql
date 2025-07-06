/*
  # Create RPC functions for user management

  1. Functions
    - get_users_with_roles: Get users filtered by specific roles
    - get_user_profiles_for_admin: Get comprehensive user profiles for admin dashboard
*/

-- Function to get users with specific roles
CREATE OR REPLACE FUNCTION get_users_with_roles(role_names text[])
RETURNS TABLE (
  id uuid,
  email text,
  user_metadata jsonb,
  user_roles text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data as user_metadata,
    COALESCE(
      ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL),
      ARRAY['user']::text[]
    ) as user_roles
  FROM auth.users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.id
  WHERE u.email_confirmed_at IS NOT NULL
  GROUP BY u.id, u.email, u.raw_user_meta_data
  HAVING 
    CASE 
      WHEN array_length(role_names, 1) IS NULL THEN true
      ELSE ARRAY_AGG(r.name) && role_names OR ARRAY_AGG(r.name) IS NULL
    END;
END;
$$;

-- Function to get comprehensive user profiles for admin dashboard
CREATE OR REPLACE FUNCTION get_user_profiles_for_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  phone text,
  bio text,
  experience_level text,
  created_at timestamptz,
  updated_at timestamptz,
  user_created_at timestamptz,
  user_roles text[],
  total_bookings bigint,
  attended_classes bigint,
  articles_viewed bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    u.email,
    p.phone,
    p.bio,
    COALESCE(p.role, 'user') as experience_level,
    p.created_at,
    p.updated_at,
    u.created_at as user_created_at,
    COALESCE(
      ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL),
      ARRAY['user']::text[]
    ) as user_roles,
    COALESCE(b.total_bookings, 0) as total_bookings,
    COALESCE(b.attended_classes, 0) as attended_classes,
    COALESCE(av.articles_viewed, 0) as articles_viewed
  FROM profiles p
  JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN user_roles ur ON p.user_id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_bookings,
      COUNT(*) FILTER (WHERE status = 'attended') as attended_classes
    FROM bookings
    GROUP BY user_id
  ) b ON p.user_id = b.user_id
  LEFT JOIN (
    SELECT 
      COUNT(*) as articles_viewed
    FROM article_views
  ) av ON true
  WHERE u.email_confirmed_at IS NOT NULL
  GROUP BY 
    p.id, p.user_id, p.full_name, u.email, p.phone, p.bio, 
    p.role, p.created_at, p.updated_at, u.created_at,
    b.total_bookings, b.attended_classes, av.articles_viewed
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_users_with_roles(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profiles_for_admin() TO authenticated;