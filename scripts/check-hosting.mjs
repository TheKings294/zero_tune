// Vérifie auprès de la Green Web Foundation si un domaine est hébergé « vert » (CO2.js).
// Usage : npm run hosting:check -- repasse.exemple.fr
import { hosting } from '@tgwf/co2';

const domain = process.argv[2];
if (!domain) {
  console.error('Usage : npm run hosting:check -- <domaine>');
  process.exit(2);
}
try {
  const green = await hosting(domain, "repasse");
  console.log(`${domain} : ${green ? 'hébergement vert (Green Web Foundation)' : 'non référencé comme vert'}`);
  console.log(`→ GREEN_HOSTING=${green ? 1 : 0} dans compose.yml / .env`);
} catch (e) {
  console.error(`Vérification impossible (réseau ?) : ${e.message}`);
  process.exit(1);
}
