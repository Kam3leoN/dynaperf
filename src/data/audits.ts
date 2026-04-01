export interface Audit {
  id: string;
  date: string;
  partenaire: string;
  lieu: string;
  auditeur: string;
  typeEvenement: string;
  note: number | null;
  moisVersement: string;
  statut: "OK" | "NON";
}

export interface CollaborateurObjectif {
  nom: string;
  objectif: number;
  palier1: number;
  palier2: number;
  palier3: number;
}

export const collaborateursObjectifs: CollaborateurObjectif[] = [
  { nom: "Cédric MALZAT", objectif: 110, palier1: 110, palier2: 150, palier3: 175 },
  { nom: "Geoffroy L'HONNEN", objectif: 38, palier1: 38, palier2: 0, palier3: 0 },
  { nom: "Tiphaine LEMAITRE", objectif: 1, palier1: 1, palier2: 0, palier3: 0 },
  { nom: "Catherine PASSE", objectif: 1, palier1: 1, palier2: 0, palier3: 0 },
];

let nextId = 100;
const genId = () => String(nextId++);

export const initialAudits: Audit[] = [
  { id: genId(), date: "2026-01-06", partenaire: "Émilie BLAISE", lieu: "Troyes", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: 9.52, moisVersement: "Janvier", statut: "OK" },
  { id: genId(), date: "2026-01-07", partenaire: "Marine DELPUECH", lieu: "Lyon", auditeur: "Cédric", typeEvenement: "RD Distanciel", note: 7.61, moisVersement: "Janvier", statut: "OK" },
  { id: genId(), date: "2026-01-07", partenaire: "François BOUDALIEZ", lieu: "Lille", auditeur: "Cédric", typeEvenement: "RD Distanciel", note: 7.39, moisVersement: "Janvier", statut: "OK" },
  { id: genId(), date: "2026-01-07", partenaire: "Émilie BLAISE", lieu: "Troyes", auditeur: "Cédric", typeEvenement: "RDV Commercial", note: 6.56, moisVersement: "Janvier", statut: "OK" },
  { id: genId(), date: "2026-01-08", partenaire: "Stella MASSON", lieu: "Maisons-Laffitte", auditeur: "Cédric", typeEvenement: "RD Distanciel", note: 7.83, moisVersement: "Janvier", statut: "OK" },
  { id: genId(), date: "2026-01-08", partenaire: "Francine HEIDELBERGER-SCHWAB", lieu: "Bas-Rhin", auditeur: "Cédric", typeEvenement: "RD Distanciel", note: 6.52, moisVersement: "Janvier", statut: "OK" },
  { id: genId(), date: "2026-01-08", partenaire: "Émilie BLAISE", lieu: "Troyes Club BTP", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 8.40, moisVersement: "Janvier", statut: "OK" },
  { id: genId(), date: "2026-01-09", partenaire: "Julie MARCHAL", lieu: "Team Business Up Troyes", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 4.32, moisVersement: "Janvier", statut: "OK" },
  { id: genId(), date: "2026-01-12", partenaire: "Frédéric ANDORRA", lieu: "Le Cep Ange'Vin", auditeur: "Catherine", typeEvenement: "Club Affaires", note: 5.06, moisVersement: "Janvier", statut: "OK" },
  { id: genId(), date: "2026-01-13", partenaire: "Laurence FAVIER", lieu: "Pont-À-Mousson", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: 5.32, moisVersement: "Janvier", statut: "OK" },
  { id: genId(), date: "2026-01-14", partenaire: "Laurence FAVIER", lieu: "Pont-À-Mousson", auditeur: "Cédric", typeEvenement: "RDV Commercial", note: 6.33, moisVersement: "Janvier", statut: "OK" },
  { id: genId(), date: "2026-01-16", partenaire: "Lydie STEPHEN", lieu: "Verdun", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: 4.52, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-01-20", partenaire: "Anatole HEIDELBERGER", lieu: "Alsace Bossue", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 7.65, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-01-21", partenaire: "Céline MARCELIN", lieu: "La Mossig", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 7.16, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-01-22", partenaire: "Sandrine CUPERLIER", lieu: "Vierzon", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: 6.61, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-01-23", partenaire: "Laurent MARINIER", lieu: "Fleury-les-Aubrais", auditeur: "Cédric", typeEvenement: "RD Distanciel", note: 6.74, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-01-26", partenaire: "Valérie CHABRIÉ", lieu: "Du Bocage Vendéen", auditeur: "Cédric", typeEvenement: "RD Distanciel", note: 6.96, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-01-26", partenaire: "Eric WENDLING", lieu: "Schiltigheim", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 4.57, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-01-27", partenaire: "Hervé KUDADZÉ", lieu: "Strasbourg - La Wantzenau", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 6.79, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-01-28", partenaire: "Anatole HEIDELBERGER", lieu: "Sarrebourg", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 7.53, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-01-30", partenaire: "Virginie SITZ", lieu: "Erckmann-Chatrian", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 7.41, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-02-02", partenaire: "Magali AUDIBERT", lieu: "Montmorency", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 8.52, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-02-03", partenaire: "Amelie GONÇALVES", lieu: "Chambourcy", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 5.80, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-02-05", partenaire: "Audrey LEPICOUCHE", lieu: "L'Isle-Adam", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: 6.29, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-02-06", partenaire: "Alexandre ALVES", lieu: "Domont", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 8.52, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-02-10", partenaire: "Noura LEFEVRE & Alexandra ÉPINOUX", lieu: "Saint-Germain", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 6.42, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-02-11", partenaire: "Jean-François LAPIERRE", lieu: "Amiens", auditeur: "Cédric", typeEvenement: "RD Distanciel", note: 6.96, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-02-11", partenaire: "Franck TRUPIN", lieu: "Arques", auditeur: "Cédric", typeEvenement: "RDV Commercial", note: 7.90, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-02-12", partenaire: "Franck TRUPIN", lieu: "Marquise", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 8.02, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-02-12", partenaire: "Franck TRUPIN", lieu: "Dunkerque", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: 7.65, moisVersement: "Février", statut: "OK" },
  { id: genId(), date: "2026-02-16", partenaire: "Frédéric ANDORRA", lieu: "Le Cep Anjoué", auditeur: "Catherine", typeEvenement: "Club Affaires", note: 4.07, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-02-16", partenaire: "Erika DALLEAU", lieu: "Pontoise", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 6.91, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-02-16", partenaire: "Nadia EL MELIANI", lieu: "Paris 19e – Buttes-Chaumont", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 2.96, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-02-17", partenaire: "Nadia EL MELIANI", lieu: "Elancourt Dyna'Immo", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 5.31, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-02-17", partenaire: "Stella MASSON", lieu: "Maisons-Laffitte", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 0.00, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-02-18", partenaire: "Olivier GUIGNARD", lieu: "Boulogne-Billancourt", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 7.04, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-02-19", partenaire: "Nadia EL MELIANI", lieu: "Paris 16e – Passy", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 5.31, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-02-20", partenaire: "Nadia EL MELIANI", lieu: "Versailles", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 5.68, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-02-24", partenaire: "Cécile GUET", lieu: "Châteauneuf-sur-Loire", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 7.16, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-02-26", partenaire: "Sébastien FERNANDEZ & Henrique MARTINS", lieu: "Montigny-le-Bretonneux", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: 7.26, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-02", partenaire: "Cedrick JAMBEZ", lieu: "Buchelay", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 6.67, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-03", partenaire: "Lucie DELRUE-VEIGA", lieu: "Douai", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 3.83, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-03", partenaire: "Arnaud MERCHEZ", lieu: "Bethune", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 6.67, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-05", partenaire: "Arnaud BARBE", lieu: "", auditeur: "Geoffroy", typeEvenement: "Club Affaires", note: 8.15, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-06", partenaire: "François BOUDALIEZ", lieu: "Lille", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: 7.90, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-06", partenaire: "Bruno COCHEN", lieu: "", auditeur: "Geoffroy", typeEvenement: "RD Présentiel", note: 7.90, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-09", partenaire: "Daniel GIRARD", lieu: "Chartres", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 5.68, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-09", partenaire: "Christophe MARTIN", lieu: "Toulouse", auditeur: "Geoffroy", typeEvenement: "RD Présentiel", note: 9.35, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-10", partenaire: "Daniel GIRARD", lieu: "Dreux", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: 5.97, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-11", partenaire: "Aurélie et Jean-Luc SOUBIROU", lieu: "Orléans", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: 7.74, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-12", partenaire: "Virginie HARITONIDES", lieu: "Romorantin-Lanthenay", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 7.53, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-12", partenaire: "Rachelle VILLETTE", lieu: "Déols", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 5.31, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-12", partenaire: "Claire RAYNAL", lieu: "Albi", auditeur: "Geoffroy", typeEvenement: "RD Présentiel", note: 8.23, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-13", partenaire: "Sandrine CUPERLIER", lieu: "Orléans", auditeur: "Cédric", typeEvenement: "Club Affaires", note: 8.02, moisVersement: "Mars", statut: "OK" },
  { id: genId(), date: "2026-03-17", partenaire: "Thomas VOISIN", lieu: "Mont-Saint-Aignan", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: null, moisVersement: "Avril", statut: "NON" },
  { id: genId(), date: "2026-03-19", partenaire: "Daniel GIRARD", lieu: "Dreux", auditeur: "Cédric", typeEvenement: "Club Affaires", note: null, moisVersement: "Avril", statut: "NON" },
  { id: genId(), date: "2026-03-24", partenaire: "Alain GESBERT", lieu: "Honfleur", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: null, moisVersement: "Avril", statut: "NON" },
  { id: genId(), date: "2026-03-26", partenaire: "Nathalie LEBAS", lieu: "Cabourg", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: null, moisVersement: "Avril", statut: "NON" },
  { id: genId(), date: "2026-04-03", partenaire: "Cédric LE VALLOIS", lieu: "Varar Dynaclub Centre Manche", auditeur: "Cédric", typeEvenement: "Club Affaires", note: null, moisVersement: "Avril", statut: "NON" },
  { id: genId(), date: "2026-04-03", partenaire: "Cédric LE VALLOIS", lieu: "Le Varar Dynaclub Calvados", auditeur: "Cédric", typeEvenement: "Club Affaires", note: null, moisVersement: "Avril", statut: "NON" },
  { id: genId(), date: "2026-04-06", partenaire: "Michel MAZINGUE", lieu: "Vitry-en-Artois", auditeur: "Cédric", typeEvenement: "Club Affaires", note: null, moisVersement: "Avril", statut: "NON" },
  { id: genId(), date: "2026-04-07", partenaire: "Cedric BRULANT", lieu: "Pays De Mormal", auditeur: "Cédric", typeEvenement: "Club Affaires", note: null, moisVersement: "Avril", statut: "NON" },
  { id: genId(), date: "2026-04-09", partenaire: "Michel MAZINGUE", lieu: "Tourcoing Union", auditeur: "Cédric", typeEvenement: "Club Affaires", note: null, moisVersement: "Avril", statut: "NON" },
  { id: genId(), date: "2026-04-14", partenaire: "Cedric BRULANT", lieu: "Le Cateau / Caudry", auditeur: "Cédric", typeEvenement: "Club Affaires", note: null, moisVersement: "Avril", statut: "NON" },
  { id: genId(), date: "2026-04-16", partenaire: "Cedric BRULANT", lieu: "Ostrevent", auditeur: "Cédric", typeEvenement: "Club Affaires", note: null, moisVersement: "Mai", statut: "NON" },
  { id: genId(), date: "2026-04-23", partenaire: "Laurence THUILLIER", lieu: "Dynabuy Club Affaire Chartres Ambition", auditeur: "Cédric", typeEvenement: "Club Affaires", note: null, moisVersement: "Mai", statut: "NON" },
  { id: genId(), date: "2026-04-30", partenaire: "Thomas MARCETTEAU", lieu: "Rouen", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: null, moisVersement: "Mai", statut: "NON" },
  { id: genId(), date: "2026-05-05", partenaire: "Thomas BERNE", lieu: "Saint-Lô", auditeur: "Cédric", typeEvenement: "RD Présentiel", note: null, moisVersement: "Mai", statut: "NON" },
  { id: genId(), date: "2026-07-07", partenaire: "Cécilia JEANSON", lieu: "Troyes", auditeur: "Cédric", typeEvenement: "Club Affaires", note: null, moisVersement: "Juillet", statut: "NON" },
];

export const TYPES_EVENEMENT = ["Club Affaires", "RD Présentiel", "RD Distanciel", "RDV Commercial"] as const;
export const AUDITEURS = ["Cédric MALZAT", "Geoffroy L'HONNEN", "Tiphaine LEMAITRE", "Catherine PASSE"] as const;
export const MOIS_ORDRE = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"] as const;
