# TypeORM Migrations Workflow

The backend runs with `synchronize: false`. Schema changes must be applied via TypeORM migrations.

## Local development

1) Ensure `DATABASE_URL` points to the database you want to diff/apply against.

2) Generate a migration (creates a file under `src/migrations`):

```bash
pnpm -C packages/backend migration:generate --name=AddSomething
```

3) Run pending migrations (development / TS):

```bash
pnpm -C packages/backend migration:run:dev
```

4) Revert the last migration (development / TS):

```bash
pnpm -C packages/backend migration:revert:dev
```

## Production (Render)

Production uses compiled JS in `dist/`.

1) Deploy the new code (including the new migration file).
2) Run migrations in the Render Shell for the backend service:

```bash
npm run build
npm run migration:run
```

3) Verify health endpoints:
- `GET /api/v1/health`
- `GET /api/v1/health/db`

## Notes

- Migrations are executed against `DATABASE_URL` in the environment.
- Keep migrations small and reversible.
- Do not run `migration:revert` in production unless you have a confirmed rollback plan.

