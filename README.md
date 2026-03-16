# โต๊ะลพบุรี Platform

Tech stack after port:

- `client/`: React + TypeScript + Vite
- `server/`: Node.js + Express
- `Prisma`: ORM / database access
- `Neon`: PostgreSQL cloud database

## Structure

```text
client/
server/
พื้นสวนโต๊ะลพบุรี3.html   # original monolith kept as reference/spec
```

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create env files:

- `server/.env` from `server/env.example`
- `client/.env` from `client/env.example`

3. Add your Neon connection string to `server/.env`:

```bash
DATABASE_URL="postgresql://..."
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Start both apps:

```bash
npm run dev
```

## Notes

- The React + Express app is now the active codebase.
- The original `พื้นสวนโต๊ะลพบุรี3.html` file is kept as the feature reference while the remaining legacy split static files have been removed.
# -
