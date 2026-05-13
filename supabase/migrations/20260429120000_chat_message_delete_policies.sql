-- Allow admins and league owners (in addition to the message author) to delete chat messages.
DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;

CREATE POLICY "Users, admins, and league owners can delete chat messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (league_id IS NOT NULL AND public.is_league_owner(league_id, auth.uid()))
);
