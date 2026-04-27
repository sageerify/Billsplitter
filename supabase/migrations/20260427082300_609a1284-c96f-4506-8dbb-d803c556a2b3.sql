
-- Lock down SECURITY DEFINER functions: only the database may execute them.
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_group() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- set_updated_at doesn't need definer; switch to invoker and pin search_path
ALTER FUNCTION public.set_updated_at() SECURITY INVOKER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated;
