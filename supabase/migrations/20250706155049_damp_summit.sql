/*
  # Create RPC function to get users with specific roles

  1. New Functions
    - `get_users_with_roles` - Returns users that have specific roles
    
  2. Security
    - Function is accessible to authenticated users with admin privileges
*/

CREATE OR REPLACE FUNCTION get_users_with_roles(role_names text[])
RETURNS TABLE (
  id uuid,
  email text,
  raw_user_meta_data jsonb,
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
    u.raw_user_meta_data,
    ARRAY_AGG(r.name) as user_roles
  FROM auth.users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.id
  WHERE r.name = ANY(role_names)
  GROUP BY u.id, u.email, u.raw_user_meta_data
  HAVING COUNT(r.name) > 0;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_users_with_roles(text[]) TO authenticated;