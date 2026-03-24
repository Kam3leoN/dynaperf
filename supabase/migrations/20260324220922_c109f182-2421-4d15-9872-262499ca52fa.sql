
-- Add genre column to partenaires
ALTER TABLE public.partenaires ADD COLUMN IF NOT EXISTS genre text;

-- Create prenoms_genre lookup table
CREATE TABLE IF NOT EXISTS public.prenoms_genre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom text NOT NULL UNIQUE,
  genre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prenoms_genre ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read prenoms_genre" ON public.prenoms_genre FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage prenoms_genre" ON public.prenoms_genre FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed common French first names
INSERT INTO public.prenoms_genre (prenom, genre) VALUES
('Jean', 'M'), ('Pierre', 'M'), ('Michel', 'M'), ('Philippe', 'M'), ('Alain', 'M'),
('Patrick', 'M'), ('Jacques', 'M'), ('Bernard', 'M'), ('François', 'M'), ('Christophe', 'M'),
('Nicolas', 'M'), ('Stéphane', 'M'), ('Laurent', 'M'), ('Olivier', 'M'), ('Thierry', 'M'),
('David', 'M'), ('Éric', 'M'), ('Eric', 'M'), ('Frédéric', 'M'), ('Marc', 'M'),
('Sébastien', 'M'), ('Thomas', 'M'), ('Alexandre', 'M'), ('Julien', 'M'), ('Guillaume', 'M'),
('Vincent', 'M'), ('Antoine', 'M'), ('Mathieu', 'M'), ('Maxime', 'M'), ('Bruno', 'M'),
('Fabrice', 'M'), ('Pascal', 'M'), ('Gilles', 'M'), ('Didier', 'M'), ('Yves', 'M'),
('Hervé', 'M'), ('Serge', 'M'), ('Daniel', 'M'), ('Robert', 'M'), ('André', 'M'),
('Paul', 'M'), ('Louis', 'M'), ('Charles', 'M'), ('Emmanuel', 'M'), ('Romain', 'M'),
('Arnaud', 'M'), ('Benoît', 'M'), ('Cédric', 'M'), ('Damien', 'M'), ('Franck', 'M'),
('Hugues', 'M'), ('Jérôme', 'M'), ('Luc', 'M'), ('Martin', 'M'), ('Rémi', 'M'),
('Xavier', 'M'), ('Yann', 'M'), ('Grégory', 'M'), ('Ludovic', 'M'), ('Raphaël', 'M'),
('Sylvain', 'M'), ('Bertrand', 'M'), ('Christian', 'M'), ('Denis', 'M'), ('Gérard', 'M'),
('Guy', 'M'), ('Henri', 'M'), ('Joël', 'M'), ('Lionel', 'M'), ('Maurice', 'M'),
('René', 'M'), ('Adrien', 'M'), ('Bastien', 'M'), ('Clément', 'M'), ('Florian', 'M'),
('Hugo', 'M'), ('Jérémy', 'M'), ('Kévin', 'M'), ('Léo', 'M'), ('Nathan', 'M'),
('Quentin', 'M'), ('Samuel', 'M'), ('Thibault', 'M'), ('Valentin', 'M'), ('Anthony', 'M'),
('Benjamin', 'M'), ('Cyril', 'M'), ('Fabien', 'M'), ('Gaël', 'M'), ('Jonathan', 'M'),
('Loïc', 'M'), ('Matthieu', 'M'), ('Rémy', 'M'), ('Steven', 'M'), ('Wilfried', 'M'),
('Edouard', 'M'), ('Félix', 'M'), ('Grégoire', 'M'), ('Ivan', 'M'),
('Kevin', 'M'), ('Michaël', 'M'), ('Norbert', 'M'),
('Patrice', 'M'), ('Richard', 'M'), ('Tristan', 'M'), ('Victor', 'M'),
('Claude', 'M'), ('Dominique', 'M'), ('Camille', 'M'),
('Marie', 'F'), ('Nathalie', 'F'), ('Isabelle', 'F'), ('Catherine', 'F'), ('Sylvie', 'F'),
('Christine', 'F'), ('Valérie', 'F'), ('Sandrine', 'F'), ('Céline', 'F'), ('Sophie', 'F'),
('Anne', 'F'), ('Véronique', 'F'), ('Laurence', 'F'), ('Stéphanie', 'F'), ('Virginie', 'F'),
('Caroline', 'F'), ('Audrey', 'F'), ('Émilie', 'F'), ('Julie', 'F'),
('Marion', 'F'), ('Pauline', 'F'), ('Charlotte', 'F'), ('Aurélie', 'F'), ('Laetitia', 'F'),
('Mélanie', 'F'), ('Delphine', 'F'), ('Patricia', 'F'), ('Brigitte', 'F'), ('Monique', 'F'),
('Françoise', 'F'), ('Martine', 'F'), ('Nicole', 'F'), ('Chantal', 'F'),
('Corinne', 'F'), ('Florence', 'F'), ('Hélène', 'F'), ('Karine', 'F'), ('Pascale', 'F'),
('Béatrice', 'F'), ('Claire', 'F'), ('Élise', 'F'), ('Geneviève', 'F'), ('Jeanne', 'F'),
('Laura', 'F'), ('Lucie', 'F'), ('Manon', 'F'), ('Margaux', 'F'), ('Sarah', 'F'),
('Anaïs', 'F'), ('Chloé', 'F'), ('Élodie', 'F'), ('Justine', 'F'), ('Léa', 'F'),
('Marine', 'F'), ('Morgane', 'F'), ('Océane', 'F'), ('Alexandra', 'F'), ('Aline', 'F'),
('Carole', 'F'), ('Diane', 'F'), ('Estelle', 'F'), ('Fanny', 'F'), ('Gaëlle', 'F'),
('Inès', 'F'), ('Jessica', 'F'), ('Laure', 'F'), ('Myriam', 'F'), ('Noémie', 'F'),
('Olivia', 'F'), ('Rachel', 'F'), ('Sabrina', 'F'), ('Alice', 'F'),
('Amandine', 'F'), ('Barbara', 'F'), ('Clémence', 'F'), ('Eva', 'F'),
('Jade', 'F'), ('Lisa', 'F'), ('Magali', 'F'), ('Nadia', 'F'),
('Roxane', 'F'), ('Solène', 'F'), ('Vanessa', 'F'),
('Agnès', 'F'), ('Bénédicte', 'F'), ('Colette', 'F'), ('Danièle', 'F'),
('Elsa', 'F'), ('Gisèle', 'F'), ('Jacqueline', 'F'), ('Madeleine', 'F'),
('Natacha', 'F'), ('Odette', 'F'), ('Renée', 'F'), ('Simone', 'F'),
('Thérèse', 'F'), ('Yvette', 'F'), ('Zoé', 'F'), ('Emilie', 'F'),
('Elodie', 'F'), ('Elise', 'F'), ('Helene', 'F'), ('Amelie', 'F'),
('Stephanie', 'F'), ('Cecile', 'F'), ('Noemie', 'F')
ON CONFLICT (prenom) DO NOTHING;

-- Auto-detect existing partenaires genre
UPDATE public.partenaires p
SET genre = pg.genre
FROM public.prenoms_genre pg
WHERE LOWER(TRIM(SPLIT_PART(p.prenom, '-', 1))) = LOWER(pg.prenom)
AND p.genre IS NULL;
