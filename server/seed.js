import { hashPassword } from './auth.js';
import { openDb } from './db.js';

const USERS = [
  ['mehdi', 'Mehdi', 'email', 'mehdi.b@exemple.fr'],
  ['catherine', 'Catherine', 'email', 'catherine.l@exemple.fr'],
  ['ines', 'Inès', 'tel', '06 01 02 03 04'],
  ['lucas', 'Lucas', 'email', 'lucas.d@exemple.fr'],
  ['chloe', 'Chloé', 'tel', '06 11 22 33 44'],
  ['yanis', 'Yanis', 'email', 'yanis.k@exemple.fr'],
  ['sarah', 'Sarah', 'email', 'sarah.m@exemple.fr'],
  ['thomas', 'Thomas', 'tel', '06 98 76 54 32'],
  ['lea', 'Léa', 'email', 'lea.p@exemple.fr'],
  ['hugo', 'Hugo', 'email', 'hugo.r@exemple.fr'],
  ['amina', 'Amina', 'email', 'amina.s@exemple.fr'],
  ['nathan', 'Nathan', 'tel', '06 12 12 12 12'],
  ['kevin', 'Kevin', 'email', 'kevin.t@exemple.fr'],
];

// [vendeur, titre, prix en euros (0 = don), catégorie, âge en jours, description]
const ANNONCES = [
  ['mehdi', 'Calculatrice graphique TI-83 Premium CE', 35, 'Calculatrices', 1, "Achetée en 2de, parfait état, mode examen fonctionnel.\nLivrée avec câble USB et housse. Remise au CDI le midi."],
  ['catherine', 'Annales de bac Mathématiques 2025', 0, 'Mathématiques', 2, "Annales corrigées, spécialité maths. Quelques annotations au crayon, facile à gommer.\nJe quitte le lycée : à récupérer avant fin juin."],
  ['ines', 'Dictionnaire bilingue anglais-français', 8, 'Langues', 3, "Édition de poche, couverture un peu abîmée, toutes les pages sont là."],
  ['lucas', 'Blouse de chimie en coton, taille M', 0, 'Sciences', 4, "Lavée, aucune tache. Obligatoire en TP de physique-chimie."],
  ['chloe', 'Kit de géométrie complet (compas, équerre, rapporteur)', 3, 'Mathématiques', 5, "Compas à bague, règle 30 cm, équerre et rapporteur dans une pochette."],
  ['yanis', 'Clé USB 32 Go', 4, 'Informatique', 6, "Formatée, fonctionne très bien. Pratique pour les exposés."],
  ['catherine', 'Manuel de maths spécialité Terminale', 12, 'Mathématiques', 7, "Édition utilisée au lycée cette année. Couvert, en bon état, quelques pages surlignées."],
  ['sarah', 'Bescherelle — La conjugaison pour tous', 0, 'Français', 8, "Très bon état. Je le donne, il m'a bien servi au collège."],
  ['thomas', 'Calculatrice Casio Graph 35+E II', 28, 'Calculatrices', 9, "Mode examen OK, piles neuves fournies. Petite rayure sur le couvercle."],
  ['lea', 'Lot de 5 classiques (Candide, Bel-Ami, Antigone…)', 0, 'Livres', 10, "Éditions de poche, lus une fois. Je préfère qu'ils servent à quelqu'un."],
  ['hugo', 'Atlas géographique du monde', 6, 'Histoire-Géo', 12, "Édition récente, cartes à jour. Couverture rigide."],
  ['amina', 'Fiches de révision maths 1re (classeur)', 0, 'Mathématiques', 13, "Toutes mes fiches de 1re, rangées par chapitre. Écriture lisible, promis."],
  ['nathan', "Manuel d'espagnol 2de", 10, 'Langues', 14, "Bon état général, quelques mots au crayon dans les exercices."],
  ['lucas', 'Lunettes de protection pour le labo', 2, 'Sciences', 16, "Lunettes ajustables, verres sans rayure."],
  ['chloe', 'Trousse et 6 surligneurs neufs', 0, 'Fournitures', 18, "Surligneurs encore sous blister, trousse en tissu."],
  ['catherine', 'Classeur A4 et intercalaires', 0, 'Fournitures', 21, "Classeur 4 anneaux, dos 40 mm, avec 12 intercalaires."],
  ['sarah', 'Manuel de SES Terminale', 15, 'Autre', 23, "Très bon état, couvert depuis le premier jour."],
  ['hugo', 'Calculatrice NumWorks', 40, 'Calculatrices', 25, "Dernière mise à jour installée, mode examen OK, avec son câble."],
  ['mehdi', 'Annales de bac français (écrit et oral)', 4, 'Français', 27, "Commentaires et dissertations corrigés, plus les conseils pour l'oral."],
  ['yanis', 'Souris USB et câble HDMI', 3, 'Informatique', 30, "Les deux fonctionnent. Câble HDMI de 1,5 m."],
];

export function seed(db, { password = process.env.DEMO_PASSWORD || 'demo', now = Date.now() } = {}) {
  const insUser = db.prepare(
    'INSERT INTO users (username, password_hash, first_name, contact_type, contact_value) VALUES (?, ?, ?, ?, ?)');
  const insAnn = db.prepare(
    'INSERT INTO annonces (user_id, titre, description, prix_cents, categorie, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  db.transaction(() => {
    db.exec('DELETE FROM annonces; DELETE FROM users;'); // les sessions suivent (ON DELETE CASCADE)
    const ids = {};
    for (const [username, first, type, value] of USERS) {
      ids[username] = insUser.run(username, hashPassword(password), first, type, value).lastInsertRowid;
    }
    for (const [owner, titre, prix, cat, days, desc] of ANNONCES) {
      const at = new Date(now - days * 86400000).toISOString();
      insAnn.run(ids[owner], titre, desc, prix ? prix * 100 : null, cat, at);
    }
  })();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = openDb();
  seed(db);
  console.log(`seed ok : ${db.prepare('SELECT COUNT(*) n FROM annonces').get().n} annonces`);
}
