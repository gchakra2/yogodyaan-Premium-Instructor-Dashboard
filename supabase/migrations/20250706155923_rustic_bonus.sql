/*
  # Create function to get users with specific roles

  1. New Functions
    - `get_users_with_roles` - Returns users that have specific roles
    
  2. Security
    - Function is accessible to authenticated users with admin privileges
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
      ARRAY[]::text[]
    ) as user_roles
  FROM auth.users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.id
  WHERE EXISTS (
    SELECT 1 
    FROM user_roles ur2 
    JOIN roles r2 ON ur2.role_id = r2.id 
    WHERE ur2.user_id = u.id 
    AND r2.name = ANY(role_names)
  )
  GROUP BY u.id, u.email, u.raw_user_meta_data
  ORDER BY u.email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_users_with_roles(text[]) TO authenticated;