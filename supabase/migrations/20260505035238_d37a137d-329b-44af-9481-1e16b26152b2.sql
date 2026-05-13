DROP POLICY IF EXISTS "Admins can delete any chat message" ON public.chat_messages;
DROP POLICY IF EXISTS "League owners can delete league messages" ON public.chat_messages;

CREATE POLICY "Admins can delete any chat message"
  ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "League owners can delete league messages"
  ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING (
    league_id IS NOT NULL
    AND public.is_league_owner(league_id, auth.uid())
  );