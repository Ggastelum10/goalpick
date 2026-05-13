-- Allow admins to delete any chat message (moderation)
CREATE POLICY "Admins can delete any chat message"
  ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Also allow league owners to delete messages in their own leagues
CREATE POLICY "League owners can delete league messages"
  ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING (
    league_id IS NOT NULL
    AND public.is_league_owner(league_id, auth.uid())
  );
