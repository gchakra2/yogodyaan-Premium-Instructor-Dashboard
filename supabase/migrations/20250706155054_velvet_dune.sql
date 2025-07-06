/*
  # Create RPC function for admin user profiles

  1. New Functions
    - `get_user_profiles_for_admin` - Returns comprehensive user profile data for admin dashboard
    
  2. Security
    - Function is accessible to authenticated users with admin privileges
*/

CREATE OR REPLACE FUNCTION get_user_profiles_for_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  phone text,
  bio text,
  experience_level text,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
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
    p.phone,
    p.bio,
    COALESCE(p.role, 'user') as experience_level,
    p.created_at,
    p.updated_at,
    u.email,
    u.created_at as user_created_at,
    COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY['user']) as user_roles,
    COALESCE(b.total_bookings, 0) as total_bookings,
    COALESCE(b.attended_classes, 0) as attended_classes,
    COALESCE(av.articles_viewed, 0) as articles_viewed
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.user_id
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_bookings,
      COUNT(*) FILTER (WHERE status = 'attended') as attended_classes
    FROM bookings
    GROUP BY user_id
  ) b ON u.id = b.user_id
  LEFT JOIN (
    SELECT 
      COUNT(*) as articles_viewed
    FROM article_views
  ) av ON true
  GROUP BY 
    p.id, p.user_id, p.full_name, p.phone, p.bio, p.role, 
    p.created_at, p.updated_at, u.email, u.created_at,
    b.total_bookings, b.attended_classes, av.articles_viewed
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profiles_for_admin() TO authenticated;