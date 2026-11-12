export const CATEGORIES = ['Mathématiques', 'Français', 'Langues', 'Sciences', 'Histoire-Géo',
  'Informatique', 'Calculatrices', 'Fournitures', 'Livres', 'Autre'];

const len = (s) => [...s].length; // caractères, comme SQLite length()
const str = (v) => (typeof v === 'string' ? v.trim() : '');

export function normalizeContact(type, raw) {
  const v = str(raw);
  if (type === 'email') {
    return v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
  }
  const digits = v.replace(/[\s.\-]/g, '');
  if (/^0[1-9]\d{8}$/.test(digits)) return digits.replace(/(\d{2})(?=\d)/g, '$1 ');
  if (/^\+33[1-9]\d{8}$/.test(digits)) return digits;
  return null;
}

export function validateRegister(b = {}) {
  const e = {};
  const username = str(b.username);
  const first = str(b.prenom);
  const type = b.contact_type;
  if (!/^[a-z0-9_-]{3,30}$/.test(username)) e.username = 'Identifiant : 3 à 30 caractères, minuscules, chiffres, tiret ou souligné.';
  if (typeof b.password !== 'string' || b.password.length < 8 || b.password.length > 200) e.password = 'Mot de passe : 8 caractères minimum.';
  if (!first || len(first) > 40) e.prenom = 'Indiquez votre prénom (40 caractères maximum).';
  if (type !== 'email' && type !== 'tel') e.contact_type = 'Choisissez email ou téléphone.';
  const contact = type === 'email' || type === 'tel' ? normalizeContact(type, b.contact_value) : null;
  if (!e.contact_type && !contact) {
    e.contact_value = type === 'email' ? 'Email invalide. Exemple : prenom@exemple.fr' : 'Téléphone invalide. Exemple : 06 12 34 56 78';
  }
  return { errors: e, value: { username, password: b.password, prenom: first, type, contact } };
}

export function validateAnnonce(b = {}) {
  const e = {};
  const titre = str(b.titre);
  const description = str(b.description);
  const don = b.don === true;
  let prixCents = null;
  if (!titre) e.titre = 'Indiquez un titre.';
  else if (len(titre) > 80) e.titre = 'Titre : 80 caractères maximum.';
  if (!description) e.description = 'Ajoutez une description.';
  else if (len(description) > 1000) e.description = 'Description : 1 000 caractères maximum.';
  if (!don) {
    const p = typeof b.prix === 'number' ? b.prix : NaN;
    if (!Number.isFinite(p) || p <= 0 || p > 9999) e.prix = 'Indiquez un prix (de 0,01 à 9 999 €) ou cochez « C’est un don ».';
    else prixCents = Math.round(p * 100);
  }
  if (!CATEGORIES.includes(b.categorie)) e.categorie = 'Choisissez une catégorie.';
  return { errors: e, value: { titre, description, prixCents, categorie: b.categorie } };
}
