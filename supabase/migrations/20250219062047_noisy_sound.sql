/*
  # Add project updates functionality

  1. New Tables
    - `updates`
      - `id` (uuid, primary key)
      - `content` (text)
      - `project_id` (uuid, foreign key to projects)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `updates` table
    - Add policies for:
      - Anyone can read updates
      - Project owners can create updates
*/

-- Create updates table
CREATE TABLE IF NOT EXISTS updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  project_id uuid REFERENCES projects NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

-- Updates policies
CREATE POLICY "Anyone can read updates"
  ON updates FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Project owners can create updates"
  ON updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = updates.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Add backer_count column to projects if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'backer_count'
  ) THEN
    ALTER TABLE projects ADD COLUMN backer_count integer DEFAULT 0;
  END IF;
END $$;

-- Create function to update backer count
CREATE OR REPLACE FUNCTION update_backer_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET backer_count = (
    SELECT COUNT(DISTINCT user_id)
    FROM pledges
    WHERE project_id = NEW.project_id
  )
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update backer count when pledge is created
DROP TRIGGER IF EXISTS update_backer_count_after_pledge ON pledges;
CREATE TRIGGER update_backer_count_after_pledge
  AFTER INSERT ON pledges
  FOR EACH ROW
  EXECUTE FUNCTION update_backer_count();