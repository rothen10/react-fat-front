# KN Residence — Guide utilisateur et guide de formation

Ce document décrit chaque interface de l'application, les flux de travail, et
surtout la signification des **états d'une réservation**, leurs couleurs, la
légende et leur impact sur les statistiques.

---

## 1. Principes généraux

- Tous les règlements sont en **espèces**, saisis manuellement par un agent.
- Deux profils : **Gérant** (saisie quotidienne) et **Propriétaire** (pilotage).
- L'application fonctionne en **mode clair** ou **mode sombre** (bouton lune/soleil
  dans l'en-tête). Le choix est mémorisé sur le poste.
- L'arrière-plan comporte des animations abstraites très discrètes : elles
  n'interfèrent jamais avec la lecture des chiffres.

---

## 2. Écran de connexion

1. Saisir l'**identifiant** et le **mot de passe** fournis.
2. Le gérant arrive sur **Logements**, le propriétaire sur **Tableau de bord**.
3. La déconnexion se fait par l'icône de sortie, à droite de l'en-tête.

---

## 3. Interface « Logements »

Grille des dix logements (appartements et studios) avec :

- le **nom**, la **disposition** et le **tarif par nuit** ;
- une pastille de disponibilité **du jour** ;
- un filtre par type.

Cliquer sur une carte ouvre le calendrier du logement.

---

## 4. Interface « Calendrier d'un logement »

### 4.1 Lecture du calendrier

- Chaque case = un jour. La case **du jour courant** est mise en évidence
  (bordure et pastille colorées) pour se repérer instantanément.
- Une case colorée = un jour couvert par une réservation ; le nom du client
  apparaît sur le jour d'arrivée.
- La **légende** est affichée au-dessus du calendrier.

### 4.2 Créer une réservation

1. Cliquer sur le jour d'**arrivée** puis sur le jour de **départ** (ou utiliser
   le bouton « Nouvelle réservation »).
2. Choisir le client :
   - **Client existant** : liste déroulante avec barre de recherche (nom ou
     téléphone). Aucune ressaisie de la fiche n'est nécessaire.
   - **Nouveau client** : bouton « Nouveau client » puis saisie de la fiche ;
     le client est créé et rattaché automatiquement.
3. Renseigner nombre de personnes, montant total, **avance versée**, statut,
   motif, provenance et destination.
4. Enregistrer. Un **chevauchement** de dates est bloqué par l'application.

### 4.3 Consulter et modifier une réservation

Cliquer sur une case occupée ouvre le **panneau financier** :

- séjour, nombre de nuits, montants total / payé / **restant dû** ;
- **historique des paiements** (date, montant, agent) ;
- ajout d'un **nouveau paiement** ;
- modification des **dates**, changement de **statut**, **annulation**.

---

## 5. Interface « Clients »

- Recherche par nom ou téléphone.
- **Nouveau client** : création d'une fiche (nom, téléphone, nationalité,
  profession, pièce d'identité, résidence).
- **Modifier** (crayon) : mise à jour de la fiche.
- **Supprimer** (corbeille) : suppression après confirmation. Les réservations
  déjà enregistrées restent inchangées.
- Colonnes **Séjours** et **Nuits cumulées** : indicateurs de fidélité calculés
  depuis l'historique des réservations.

---

## 6. Interface « Tableau de bord »

- Sélecteur de période : **Jour / Semaine / Mois / Année**.
- Indicateurs : **chiffre d'affaires**, **taux d'occupation**,
  **réservations actives**, **arrivées / départs du jour**.
- Bloc **Fonds en attente** : total des sommes restant à encaisser. Un clic
  déplie la **liste des créances**.
- **Chaque ligne de créance est cliquable** : elle ouvre le même panneau
  financier que le calendrier, pour encaisser un solde ou corriger la
  réservation sans quitter le tableau de bord.
- Graphique d'**évolution des revenus** et barres d'**occupation par logement**.

---

## 7. États d'une réservation, couleurs et légende

| État affiché | Couleur | Signification métier |
|---|---|---|
| Disponible | fond neutre (carte) | Aucun séjour ce jour-là : la nuitée est vendable. |
| En attente | bleu | Réservation enregistrée mais **non confirmée** (option posée, client non arrivé, avance non versée). |
| Confirmée · solde dû | orange / ambre | Séjour ferme, mais **il reste de l'argent à encaisser**. |
| Confirmée · soldée | vert | Séjour ferme et **intégralement payé**. |
| Séjour terminé | gris | La date de départ est passée (ou statut « terminée »). |
| Annulée | rouge, texte barré | Réservation annulée : elle n'est plus opposable. |

### 7.1 Règles de calcul de l'état

L'état affiché n'est pas saisi à la main : il est **déduit** de trois données
(statut, dates, montant restant), dans cet ordre de priorité :

1. statut « annulée » → **Annulée** ;
2. statut « terminée » **ou** date de départ dépassée → **Séjour terminé** ;
3. statut « en attente » → **En attente** ;
4. sinon : montant restant > 0 → **Solde dû**, sinon → **Soldée**.

### 7.2 Justification des choix de couleurs

- **Bleu (en attente)** : couleur neutre et froide, elle signale une information
  « en suspens » sans créer d'urgence. Une option n'est ni un problème ni un
  acquis.
- **Orange (solde dû)** : couleur d'alerte douce, universellement associée à
  « action requise ». C'est le seul état qui demande un geste commercial
  (relance, encaissement) ; il doit sauter aux yeux sans dramatiser.
- **Vert (soldée)** : validation, dossier clos financièrement. Le gérant peut
  passer son chemin.
- **Gris (terminé)** : information d'archive, volontairement désaturée pour ne
  pas concurrencer visuellement les séjours en cours.
- **Rouge barré (annulée)** : le barré ajoute un signal non chromatique, lisible
  par les personnes daltoniennes et en impression noir et blanc.
- Chaque couleur est doublée d'un **libellé dans la légende** et d'un contour :
  l'information n'est jamais portée par la couleur seule (accessibilité).
- La palette (or, brun profond, verts sourds) reprend l'identité du logo, et les
  teintes conservent le même sens en **mode clair comme en mode sombre**.

### 7.3 Impact des états sur les statistiques

| État | Chiffre d'affaires | Taux d'occupation | Réservations actives | Fonds en attente |
|---|---|---|---|---|
| En attente | non (tant qu'aucun paiement) | non | non | oui, si un solde existe |
| Confirmée · solde dû | oui, à hauteur des **paiements encaissés** | oui | oui | **oui** (montant restant) |
| Confirmée · soldée | oui, montant total | oui | oui | non |
| Séjour terminé | oui (historique) | oui, sur la période passée | non | oui si un impayé subsiste |
| Annulée | non | non | non | non |

Points clés à retenir en formation :

- Le **chiffre d'affaires suit l'argent réellement encaissé** (paiements en
  espèces saisis), pas les montants promis. Une réservation confirmée mais non
  payée ne gonfle donc pas le CA.
- Les **fonds en attente** sont l'exact miroir : ce qui est promis mais pas
  encore encaissé. CA + fonds en attente = valeur totale des séjours vendus.
- Une **annulation** retire la réservation de tous les agrégats : elle ne doit
  jamais être utilisée pour « effacer » un séjour réellement effectué (utiliser
  « terminée » dans ce cas).
- Le **taux d'occupation** compte les nuitées bloquées par les réservations non
  annulées : laisser une réservation « en attente » trop longtemps fausse la
  disponibilité perçue.

---

## 8. Bonnes pratiques quotidiennes

1. Le matin : consulter **arrivées / départs du jour** sur le tableau de bord.
2. À chaque encaissement : ouvrir la réservation et **ajouter le paiement**
   immédiatement, avec le nom de l'agent.
3. En fin de journée : vérifier la **liste des créances** et relancer les soldes
   dus.
4. Nettoyer les réservations « en attente » périmées (confirmer ou annuler).

## Mise à jour — Espace public, paiements et notifications

### 1. Espace commun (page d'accueil, `/`)
Écran public visible sans connexion : présentation des logements (type, description,
équipements, tarif par nuit, disponibilité du jour) et bouton **Réserver**.
Le formulaire de réservation en ligne demande le nom, le téléphone Mobile Money, les dates,
le nombre de personnes, l'opérateur (Orange Money / MTN MoMo) et la part à régler
(avance 30 % ou totalité). Après validation, l'utilisateur est redirigé vers la page de
paiement Moneroo ; la réservation est créée au statut **En attente** et n'est comptée dans le
chiffre d'affaires qu'une fois le paiement encaissé.
En haut à droite : bascule clair/sombre et bouton **Sign in** vers `/login` (Gérant / Propriétaire).

### 2. Onglet Paiements
Journal de tous les encaissements : date, client, logement, type (**Espèces** à la réception ou
**En ligne** via Mobile Money) et montant. Filtres par canal et recherche par client ou logement.
Les cartes du haut totalisent le montant encaissé, la part en ligne et le nombre d'opérations.
Distinguer les deux canaux permet de rapprocher la caisse physique des versements Moneroo.

### 3. Notifications
La cloche dans l'en-tête liste les nouvelles réservations (notamment celles reçues en ligne).
Un point doré signale les notifications non lues ; cliquer une ligne ouvre le détail financier
de la réservation, où le gérant peut confirmer, encaisser, modifier les dates ou annuler.

### 4. Fiche client et historique
Dans l'écran **Clients**, un clic sur une ligne ouvre l'historique complet des séjours du client
(dates, nuits, statut, montant payé, reste dû). Les icônes à droite restent réservées à la
modification et à la suppression de la fiche.

### 5. Calendrier — changement d'état
Un clic sur une réservation du calendrier ouvre la même fenêtre de détail : le bouton
**Confirmer** fait passer une réservation *En attente* (jaune) à *Confirmée* (bleu), ce qui la
comptabilise dans les réservations actives et le taux d'occupation. La date du jour est
encadrée en doré.
