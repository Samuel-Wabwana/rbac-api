# Chemin : JSON → template HTML → PDF téléchargeable

Ce fichier est la **source de vérité** du chantier. Chaque étape livrée doit y être cochée **et** inscrite dans le [journal](#journal-des-étapes-fournies).

Swagger UI (une fois le serveur lancé) : [http://localhost:3000/docs](http://localhost:3000/docs)

## Objectif

Recevoir un tableau JSON (ex. utilisateurs), fusionner chaque entrée avec un template HTML, produire **un PDF distinct par entrée**, puis permettre le téléchargement.

Exemple d’entrée :

```json
{
  "templateId": "user-card",
  "photo": "<imageId>",
  "items": [
    { "name": "user1", "table": "josh" },
    { "name": "user2", "table": "anna" }
  ]
}
```

## Principes

- Un lot = un **job** d’impression, pas un CRUD « printer » générique.
- Un PDF par élément du tableau.
- Templates versionnés dans le dépôt (`src/printers/templates/`).
- Documenter chaque endpoint dans Swagger au moment où il est ajouté.

## Endpoints

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| `POST` | `/printers/images` | Upload PNG/JPEG/WebP, retourne un `id` |
| `GET` | `/printers/images/:imageId` | Prévisualisation de l’image |
| `POST` | `/printers/jobs` | Génère les PDF (synchrone, max 30 items) |
| `GET` | `/printers/jobs/:jobId` | Statut + URLs de téléchargement |
| `GET` | `/printers/jobs/:jobId/files/:fileId` | PDF d’un item |
| `GET` | `/printers/jobs/:jobId/archive` | ZIP de tous les PDF |

Le CRUD scaffold (`GET/POST/PATCH/DELETE /printers`) a été retiré.

---

## Étapes

### 1. Documentation API (Swagger)

- [x] Installer `@nestjs/swagger`
- [x] Brancher Swagger dans `src/main.ts` (UI sur `/docs`)
- [x] Activer le plugin CLI Nest pour les DTO
- [x] Annoter les contrôleurs existants (`App`, `Printers`)

**Livrable :** `yarn start:dev` → interface lisible sur `/docs`.

### 2. Contrats HTTP du job d’impression

- [x] Remplacer le CRUD scaffold par un modèle **job**
- [x] DTO `CreatePrintJobDto` : `templateId` + `photo` (optionnel, partagé) + `items` (tableau JSON)
- [x] Validation (`class-validator` / `class-transformer`) + `ValidationPipe` global
- [x] Schémas Swagger (`@ApiProperty`, réponses 201 / 400)

**Livrable :** le body attendu est documenté et rejeté s’il est invalide.

### 3. Templates HTML

- [x] Dossier `src/printers/templates/` (`user-card.hbs`)
- [x] Moteur de fusion (Handlebars) avec échappement HTML
- [x] Chargement d’un template par `templateId` (fichier connu, pas de chemin libre)

**Livrable :** pour un user `{ name, table }`, un HTML complet prêt à imprimer.

### 4. Moteur HTML → PDF

- [x] Puppeteer, un navigateur réutilisé par lot
- [x] Une page (donc un PDF) par item
- [x] Options A4 + `printBackground`
- [x] Gérer timeout, erreurs de rendu, fermeture du browser

**Livrable :** buffers PDF valides en local.

### 5. Stockage et identifiants

- [x] Écrire les PDF hors git (`storage/pdfs/`)
- [x] Noms de fichiers sanitisés
- [x] Métadonnées job : `jobId`, liste `{ fileId, filename, item }`

**Livrable :** un job persistant le temps du téléchargement (disque local d’abord).

### 6. Endpoints de génération et de lecture

- [x] `POST /printers/jobs` → crée le job, lance la génération
- [x] `GET /printers/jobs/:jobId` → statut + liste des fichiers
- [x] Documenter dans Swagger (body, 201, 404)

**Livrable :** un client peut lancer un lot et voir les fichiers produits.

### 7. Téléchargement

- [x] `GET /printers/jobs/:jobId/files/:fileId` → PDF, `Content-Disposition: attachment`
- [x] 404 si job ou fichier inconnu
- [x] Documenter le type `application/pdf` dans Swagger

**Livrable :** chaque PDF est retéléchargeable séparément.

### 8. Lot volumineux (si besoin)

- [x] Pas de BullMQ : génération **synchrone** plafonnée à 30 items (`MAX_PRINT_JOB_ITEMS`)
- [x] Statuts `pending | processing | done | failed` (le POST attend `done` ou `failed`)
- [x] `GET /printers/jobs/:jobId/archive` : ZIP de tout le job

**Livrable :** au-delà de 30 items, 400 ; file d’attente Redis reportée (hors scope).

### 9. Tests et durcissement

- [x] Tests unitaires fusion template + sanitization des noms
- [x] Test e2e : POST job → GET fichier (PDF non vide ; `PdfService` mocké pour la CI)
- [x] Notes Docker : Chromium / libs système pour le moteur PDF

**Livrable :** le chemin critique est reproductible en CI.

### 10. Images dans les templates

- [x] `POST /printers/images` (multipart `file`) : PNG / JPEG / WebP, max 5 Mo, identifiant UUID
- [x] Réponse `{ id, originalName, contentType, url }` — jamais un chemin disque
- [x] Au rendu du job, `photo` (niveau job) est hydraté en data URL et injecté dans chaque item
- [x] Helper Handlebars `{{#image photo}}` dans `user-card.hbs`
- [x] `GET /printers/images/:imageId` pour prévisualiser
- [x] Fichiers hors git (`storage/images/`)

**Livrable :** upload → `photo` au niveau du job → image dans chaque PDF.

### 11. Police du template

- [x] Dossier versionné `src/printers/fonts/`
- [x] Fichier nommé comme le template : `user-card.woff2` (ou `.woff` / `.ttf` / `.otf`)
- [x] Au rendu, hydratation en data URL + `@font-face` dans le HTML
- [x] Si le fichier est absent, le job continue avec Arial / Helvetica
- [x] `page.evaluate(() => document.fonts.ready)` avant `page.pdf()`

**Livrable :** déposer la police à côté du template ; PDF typographié si le fichier est là, sinon fallback silencieux.

#### Docker / Chromium

Puppeteer lance Chrome. Dans une image Linux, installer les libs système (ex. `ca-certificates`, `fonts-liberation`, dépendances Chromium) et lancer Chrome avec `--no-sandbox` (déjà passé dans `PdfService`). Copier aussi les templates `.hbs` et les polices (`*.woff2`, `*.woff`, `*.ttf`, `*.otf`) dans l’image (`nest build` les copie via `nest-cli.json` assets).

---

## Journal des étapes fournies

À chaque livraison, ajouter une ligne. Ne pas se contenter de cocher la case.

| Date | Étape | Statut | Détail |
| --- | --- | --- | --- |
| 2026-09-17 | 1. Documentation API (Swagger) | fournie | `@nestjs/swagger`, UI `/docs`, plugin CLI, tags App + Printers |
| 2026-09-17 | 2. Contrats HTTP du job | fournie | `CreatePrintJobDto`, `ValidationPipe` global, CRUD scaffold supprimé |
| 2026-09-17 | 3. Templates HTML | fournie | Handlebars `user-card.hbs`, templateId whitelist |
| 2026-09-17 | 4. Moteur HTML → PDF | fournie | Puppeteer, un browser par job, A4 + printBackground |
| 2026-09-17 | 5. Stockage et identifiants | fournie | `storage/pdfs/{jobId}/`, meta.json, filenames sanitisés |
| 2026-09-17 | 6. Endpoints génération / lecture | fournie | `POST /printers/jobs`, `GET /printers/jobs/:jobId` |
| 2026-09-17 | 7. Téléchargement | fournie | `GET .../files/:fileId` attachment PDF |
| 2026-09-17 | 8. Lot volumineux | fournie | max 30 items sync, statuts, ZIP `/archive` (pas de BullMQ) |
| 2026-09-17 | 9. Tests et durcissement | fournie | unitaires template/filename/job, e2e POST→GET, notes Docker |
| 2026-09-17 | 10. Images dans les templates | fournie | upload multipart, id UUID, hydrate data URL, helper Handlebars |
| 2026-09-17 | 10. Images dans les templates | fournie | `photo` déplacé hors de `items` : un id partagé par tout le job |
| 2026-09-17 | 11. Police du template | fournie | `src/printers/fonts/{templateId}.*` → data URL, ignore si absent |

---

## Hors scope (pour plus tard)

- Auth / RBAC sur les jobs
- Templates uploadés par l’utilisateur
- Stockage objet (S3 / MinIO)
- File d’attente distribuée (BullMQ / Redis) au-delà de 30 items
