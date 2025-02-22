/*
  # Create projects and pledges tables

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `goal_amount` (numeric)
      - `current_amount` (numeric)
      - `end_date` (timestamptz)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
    - `pledges`
      - `id` (uuid, primary key)
      - `amount` (numeric)
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for:
      - Anyone can read projects
      - Authenticated users can create projects
      - Project owners can update their projects
      - Anyone can read pledges
      - Authenticated users can create pledges
*/

-- Create projects table
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  goal_amount numeric NOT NULL CHECK (goal_amount > 0),
  current_amount numeric NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  end_date timestamptz NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create pledges table
CREATE TABLE pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL CHECK (amount > 0),
  project_id uuid REFERENCES projects NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Anyone can read projects"
  ON projects FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Project owners can update their projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pledges policies
CREATE POLICY "Anyone can read pledges"
  ON pledges FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create pledges"
  ON pledges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to update project current_amount
CREATE OR REPLACE FUNCTION update_project_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET current_amount = current_amount + NEW.amount
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update project amount when pledge is created
CREATE TRIGGER update_project_amount_after_pledge
  AFTER INSERT ON pledges
  FOR EACH ROW
  EXECUTE FUNCTION update_project_amount();