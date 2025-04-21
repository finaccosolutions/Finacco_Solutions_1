/*
  # Create chat histories table

  1. New Tables
    - `chat_histories`
      - `id` (uuid, primary key)
      - `title` (text)
      - `messages` (jsonb array)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `chat_histories` table
    - Add policies for authenticated users to:
      - Read their own chat histories
      - Insert their own chat histories
      - Delete their own chat histories
*/

CREATE TABLE IF NOT EXISTS chat_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  messages jsonb[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE chat_histories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own chat histories"
  ON chat_histories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat histories"
  ON chat_histories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat histories"
  ON chat_histories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);