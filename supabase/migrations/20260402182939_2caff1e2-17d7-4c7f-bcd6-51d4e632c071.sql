-- Fix 1: profiles INSERT/UPDATE policies from {public} to {authenticated}
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Also fix the SELECT policy that uses {public}
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix 2: conversation_groups broken SELECT policy
DROP POLICY IF EXISTS "Members can read groups" ON conversation_groups;
CREATE POLICY "Members can read groups"
  ON conversation_groups FOR SELECT
  TO authenticated
  USING (
    (created_by = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM conversation_group_members
      WHERE conversation_group_members.group_id = conversation_groups.id
        AND conversation_group_members.user_id = auth.uid()
    ))
  );