# lost-pets-api

REST API for the Lost Pets portal, built with NestJS and MongoDB (Mongoose).

## Quick start

```bash
cp .env.example .env          # optional, the defaults work locally
docker compose up -d          # MongoDB 7 on localhost:27017
npm install
npm run start:dev             # http://localhost:3000, Swagger UI at /docs
```

| Variable      | Default                               | Notes                                  |
| ------------- | ------------------------------------- | -------------------------------------- |
| `PORT`        | `3000`                                |                                        |
| `MONGODB_URI` | `mongodb://localhost:27017/lost-pets` |                                        |
| `JWT_SECRET`  | `dev-secret-change-me`                | **Set this in any shared environment** |
| `CORS_ORIGIN` | any origin                            | Comma-separated allow list             |

## Tests

```bash
npm test          # unit + integration (supertest + in-memory MongoDB)
npm run test:cov  # same, with coverage report in ./coverage (threshold 90%)
```

The integration tests start an in-memory MongoDB via `mongodb-memory-server`.
Set `MONGODB_URI_TEST` to run against an existing MongoDB instead.

## API contract

The full contract is in Swagger (`/docs`, JSON at `/docs-json`). Summary:

Auth: `Authorization: Bearer <accessToken>`.

| Method | Path                           | Auth     | Notes                                                                 |
| ------ | ------------------------------ | -------- | --------------------------------------------------------------------- |
| POST   | `/auth/register`               | –        | `{alias, name, email, phone, commune, password}` → `{accessToken, user}` |
| POST   | `/auth/login`                  | –        | `{email, password}` → `{accessToken, user}`                           |
| GET    | `/users/me`                    | required | Private profile                                                       |
| PATCH  | `/users/me`                    | required | `{alias?, name?, phone?, commune?}`                                   |
| POST   | `/pets`                        | required | `{name, species, sex, size, color?, vaccines?, description?, photo}`  |
| GET    | `/pets`                        | required | Caller's pets                                                         |
| GET    | `/pets/:id`                    | required | Owner only (403 otherwise)                                            |
| PATCH  | `/pets/:id`                    | required | Owner only                                                            |
| POST   | `/publications`                | required | `{petId, commune, description?, lastSeenAddress?}`; `lostAt` is set by the server. 409 if the pet already has an active publication |
| GET    | `/publications?commune&species`| –        | Active publications only                                              |
| GET    | `/publications/mine`           | required | Caller's history, all statuses                                        |
| GET    | `/publications/:id`            | optional | Non-active publications are only visible to their owner (404 otherwise) |
| PATCH  | `/publications/:id/status`     | required | `{status: active\|found}`; owner only (403 otherwise)                 |
| POST   | `/publications/:id/comments`   | optional | `{text, type?, photo?, authorName?, authorEmail?}`. Anonymous callers must send `authorName` + `authorEmail` and get back a one-time `editToken` |
| GET    | `/publications/:id/comments`   | optional | Thread, oldest first                                                  |
| PATCH  | `/comments/:id`                | optional | `{text}`; the registered author, or anonymous author with `X-Edit-Token` |
| POST   | `/comments/:id/flag`           | optional | Flag as offensive (idempotent per registered user)                    |
| DELETE | `/comments/:id`                | –        | Always `405`: comments cannot be deleted                              |
| GET    | `/notifications`               | required | Caller's notifications, newest first                                  |
| GET    | `/notifications/unread-count`  | required | `{count}`                                                             |
| PATCH  | `/notifications/:id/read`      | required |                                                                       |
| PATCH  | `/notifications/read-all`      | required | `{updated}`                                                           |

Enums: `species: dog|cat`, `sex: male|female`, `size: small|medium|large`,
`status: active|found`, `comment type: comment|sighting|possible_finding`.

Limits: photos are base64 data URLs (`data:image/{png,jpeg,gif,webp};base64,...`), max 2MB decoded. `vaccines` max 200 chars, comment `text` max 300 chars. Request bodies are capped at 5MB.

Privacy: public responses expose the owner only as `{id, alias}`. Owner name, email and phone are returned only by `/auth/*` and `/users/me`. Anonymous commenter emails are never returned.

Notifications: every comment on a publication by someone other than its owner creates a notification for the owner.
