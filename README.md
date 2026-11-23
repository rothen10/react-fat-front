# React Front MVP

dans ce document on parle de nextjs mais on voudrait  plutot qu'il soit fat avec react. sache que l'api est lancee en local sur le port 3001. realise nous ce mvp . le front end uniquement

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ead50c1c-636b-4743-961d-754d4deeb130).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## API NestJS existante

- `VITE_API_URL` définit l’URL de base (exemple : `http://localhost:3001`). Le client ajoute `/api`, sauf si ce suffixe figure déjà dans la configuration. La valeur de repli existante est `https://kn-residence-api.vercel.app`.
- La variable est publique et ne doit contenir aucun secret. NestJS doit autoriser l’origine du frontend dans CORS. `localhost:3001` désigne la machine du navigateur.
- Connexion : `POST /api/auth/login` avec `{ username, password }`. Le JWT est conservé en mémoire seulement et envoyé comme `Authorization: Bearer …`. Un rechargement nécessite une nouvelle connexion. Les anciennes valeurs `kn_session`/`kn_token` sont supprimées, jamais restaurées.
- Les pages privées conservent leurs chemins et sont gardées avant leur affichage. Une réponse 401 détruit la session et redirige vers `/login`; les réponses 403 restent des erreurs API visibles.
- Seul le rôle exactement `gerant` affiche les commandes de réservation. L’API reste responsable de l’autorisation effective.
- Les horaires sont ceux de Douala (`+01:00`), indépendamment du fuseau du navigateur. Les créneaux sont `[début, fin)` et les séjours annulés ne bloquent pas la disponibilité.
- Le formulaire opérateur demande une échéance strictement avant l’arrivée. Le prix convenu est facultatif : vide, il est omis du POST pour laisser l’API calculer le montant.
- Création et paiement en espèces sont deux opérations API distinctes : si le paiement échoue après la création, ouvrir la réservation créée et vérifier les encaissements avant toute nouvelle tentative, sans recréer le séjour.

Tests de règles : `bun test src/lib/reservation-rules.test.ts src/lib/api.test.ts`. Les scénarios navigateur avec une API simulée ne constituent pas une certification de l’API NestJS réelle.
