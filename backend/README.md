# @ZAY Backend API

Node.js + Express REST API for the @ZAY Moroccan homemade food marketplace.

## Quick Start

```bash
npm install
cp .env.example .env       # Fill in all values
npm run migrate            # Apply database schema
npm run dev                # Start with hot-reload
```

## Project Structure

```
backend/
├── src/
│   ├── config/        # env validation, DB pool, external SDK setup
│   ├── routes/        # URL routing — middleware + controller wiring
│   ├── controllers/   # Thin: request parsing, response shaping
│   ├── services/      # All business logic
│   ├── models/        # SQL queries (parameterized)
│   ├── middleware/    # auth, validation, error handling, rate limiting
│   ├── validators/    # Joi schemas (one per route group)
│   ├── utils/         # AppError, logger, serializers
│   └── jobs/          # Cron jobs (auto-cancel orders)
├── migrations/        # SQL migration files + runner
├── tests/             # Unit + integration tests
├── server.js          # Entry point
└── Dockerfile         # Production container
```

See [`../docs/05_BACKEND_ARCHITECTURE.md`](../docs/05_BACKEND_ARCHITECTURE.md) for the full architecture documentation.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon hot-reload |
| `npm start` | Start in production mode |
| `npm run migrate` | Apply pending DB migrations |
| `npm test` | Run all tests |
| `npm run test:unit` | Unit tests only (no DB required) |
| `npm run test:integration` | Integration tests (requires test DB) |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
