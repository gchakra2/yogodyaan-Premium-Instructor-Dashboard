/*
  # Class Assignment System Functions

  1. Functions
    - get_users_with_roles: Get users filtered by specific roles
    - update_class_assignments_updated_at: Trigger function for updated_at

  2. Security
    - Functions are accessible to authenticated users with proper permissions
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
    array_agg(r.name) as user_roles
  FROM auth.users u
  INNER JOIN user_roles ur ON u.id = ur.user_id
  INNER JOIN roles r ON ur.role_id = r.id
  WHERE r.name = ANY(role_names)
  GROUP BY u.id, u.email, u.raw_user_meta_data;
END;
$$;

-- Function to update updated_at timestamp for class_assignments
CREATE OR REPLACE FUNCTION update_class_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_users_with_roles(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_class_assignments_updated_at() TO authenticated;