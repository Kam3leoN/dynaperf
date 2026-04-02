
-- Group conversations table
CREATE TABLE public.conversation_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group members
CREATE TABLE public.conversation_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.conversation_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Add group_id to messages (nullable, for group messages)
ALTER TABLE public.messages ADD COLUMN group_id UUID REFERENCES public.conversation_groups(id) ON DELETE CASCADE;

-- Allow message update by sender (for edit) and delete by sender (if unread)
CREATE POLICY "Sender can delete unread messages" ON public.messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id AND read = false);

CREATE POLICY "Sender can update unread messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id AND read = false)
  WITH CHECK (auth.uid() = sender_id);

-- Drop old update policy that only allows recipient updates
DROP POLICY IF EXISTS "Users can update own received messages" ON public.messages;

-- Recreate: recipients can mark as read, senders can edit if unread
CREATE POLICY "Recipients can mark messages read" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- RLS for conversation_groups
ALTER TABLE public.conversation_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read groups" ON public.conversation_groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.conversation_group_members WHERE group_id = id AND user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Authenticated can create groups" ON public.conversation_groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update group" ON public.conversation_groups
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete group" ON public.conversation_groups
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- RLS for conversation_group_members
ALTER TABLE public.conversation_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read group members" ON public.conversation_group_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.conversation_group_members AS gm WHERE gm.group_id = conversation_group_members.group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "Group creator can manage members" ON public.conversation_group_members
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.conversation_groups WHERE id = group_id AND created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.conversation_groups WHERE id = group_id AND created_by = auth.uid())
  );

-- Allow members to insert themselves (for joining)
CREATE POLICY "Users can insert own membership" ON public.conversation_group_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update messages SELECT policy for group messages
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;

CREATE POLICY "Users can read own or group messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = recipient_id
    OR (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.conversation_group_members WHERE group_id = messages.group_id AND user_id = auth.uid()
    ))
  );

-- Allow sending group messages
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for groups
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_group_members;
