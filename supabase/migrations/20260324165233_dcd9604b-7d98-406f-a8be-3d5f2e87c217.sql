
-- Table des suivis d'activité
CREATE TABLE public.suivi_activite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  agence text NOT NULL DEFAULT '',
  agence_referente text,
  suivi_par text NOT NULL DEFAULT '',
  nb_contrats_total integer DEFAULT 0,
  nb_contrats_depuis_dernier integer DEFAULT 0,
  observations text,
  items jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_items_valides integer DEFAULT 0,
  total_items integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suivi_activite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read suivi_activite" ON public.suivi_activite FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert suivi_activite" ON public.suivi_activite FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update suivi_activite" ON public.suivi_activite FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete suivi_activite" ON public.suivi_activite FOR DELETE TO authenticated USING (true);

-- Trigger updated_at
CREATE TRIGGER set_suivi_activite_updated_at BEFORE UPDATE ON public.suivi_activite FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table config des items de suivi d'activité
CREATE TABLE public.suivi_activite_items_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie text NOT NULL,
  numero integer NOT NULL,
  titre text NOT NULL,
  conditions text NOT NULL DEFAULT '',
  interets text NOT NULL DEFAULT '',
  conseils text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suivi_activite_items_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read suivi_activite_items_config" ON public.suivi_activite_items_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage suivi_activite_items_config" ON public.suivi_activite_items_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_suivi_items_config_updated_at BEFORE UPDATE ON public.suivi_activite_items_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed the 16 items from the Excel template
INSERT INTO public.suivi_activite_items_config (categorie, numero, titre, conditions, interets, conseils, sort_order) VALUES
('Réseau d''affaires', 1, 'Rencontres Dirigeants - Format Présentiel', '10 RD programmées sur les 12 prochains mois. Avoir 30 participants en moyenne.', 'Capter de nouveaux prospects. Les RDs sont un bon moyen de faire des ventes.', 'Anticipez la programmation des RDs en format présentiel sur 18 prochains mois.', 1),
('Réseau d''affaires', 2, 'Rencontres Dirigeants - Format Distanciel', '10 RD programmées sur les 12 prochains mois. Avoir 8 participants en moyenne.', 'Fidéliser les adhérents. Anticiper la programmation des RDs distancielles.', 'Anticipez la programmation des RDs en format distanciel sur 18 prochains mois.', 2),
('Réseau d''affaires', 3, 'Rencontres Dirigeants - Format Événementiel', 'Agences de plus de 2 ans. Avoir réalisé une événementielle.', 'Asseoir votre notoriété dans le milieu des réseaux d''affaires.', 'À réaliser si vous avez au moins 50 adhérents.', 3),
('Réseau d''affaires', 4, 'Rencontres Dirigeants - Format Repas', 'Agences avec plus de 10 adhérents. Avoir 5 à 10 participants.', 'Renforcer le lien avec ses adhérents et les fidéliser.', 'Anticipez la programmation des RDs en format repas sur 18 prochains mois.', 4),
('Réseau d''affaires', 5, 'Rencontres Dirigeants - Format Loisir', 'Agences avec plus de 20 adhérents. 1 RD programmée sur les 12 prochains mois.', 'Renforcer le lien avec ses adhérents.', '3 à 4 événements au maximum par an.', 5),
('Réseau d''affaires', 6, 'Rencontres Dirigeants - Format Conférence', 'Agences avec plus de 30 adhérents. Avoir 30 participants en moyenne.', 'Montrez que votre agence accompagne les entreprises en les aidant à se former.', 'Proposez ce format lorsque vous avez planifié et organisé les autres formats.', 6),
('Réseau d''affaires', 7, 'Club d''Affaires', 'Avoir un club d''affaires rattaché à son agence avec minimum 5 membres.', 'Proposer une offre de réseautage complémentaire aux Rencontres Dirigeants.', 'Soyez président de vos clubs. Trouvez un(e) président(e) méthodique et rigoureux.', 7),
('Avantages Tarifaires', 8, 'Programme de Fidélité', 'Avoir un contrat Programme de Fidélité Standard (Dynachats) ou sur-mesure en cours.', 'Assurer des revenus réguliers sur du long terme (3 à 5 ans).', 'Assister aux webinaires proposés par le siège pour connaître l''offre.', 8),
('Avantages Tarifaires', 9, 'Référencement Commercial', 'Avoir un contrat Référencement Commercial en cours.', 'Développer vos ventes via le Référencement Commercial.', 'Assister aux webinaires proposés par le siège.', 9),
('Avantages Tarifaires', 10, 'Force de Vente', 'Avoir un contrat Rencontres Dirigeants Force de vente en cours.', 'Développer votre business. Min 15 personnes.', 'Assister aux webinaires proposés par le siège.', 10),
('Avantages Tarifaires', 11, 'Offres Locales AVP', 'Avoir mis 10 offres locales sur les 12 derniers mois.', 'Prospecter plus facilement des CSE.', 'Lors de vos rendez-vous prospection, demander aux CSE les offres qui les intéressent.', 11),
('Résultats Commerciaux', 12, 'Prospection', 'Avoir 6 rendez-vous de prospection par semaine (à temps plein). 3 à temps partiel.', 'Chaque rendez-vous est une opportunité de signer des contrats.', 'Participez aux événements de votre territoire : réseautez 2 à 3 fois par semaine.', 12),
('Résultats Commerciaux', 13, 'Vente', 'Avoir réalisé une signature de vente sous les 30 derniers jours.', 'Développer votre chiffre d''affaires en signant tout type de contrat DYNABUY.', 'Préparez votre entretien de prospection en se renseignant sur l''entreprise.', 13),
('Résultats Commerciaux', 14, 'Mise en Place', 'Avoir réalisé systématiquement une mise en place dans la semaine qui suit la signature.', 'S''assurer l''utilisation immédiate des services. Planifier le RDV de suivi.', 'Passez du temps pour bien expliquer tous les services dont bénéficie le client.', 14),
('Résultats Commerciaux', 15, 'Suivi Clients', 'Réaliser au moins 2 rendez-vous de suivi clientèle par semaine (à temps plein).', 'S''assurer que les clients soient satisfaits des services Dynabuy.', 'Privilégiez le présentiel au format distanciel.', 15),
('Résultats Commerciaux', 16, 'Résiliations', 'Avoir eu plus de 3 résiliations dans les 30 derniers jours.', 'Faire le point sur l''équilibre entre les résiliations et les nouveaux contrats.', 'Consolider la pérennité de son portefeuille clients.', 16);
