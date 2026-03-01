# BiteSpeed Identity Reconciliation API

A REST API that consolidates multiple customer contact records (across different emails/phones) into a single unified identity.

**Stack:** Node.js · TypeScript · Express · Prisma · PostgreSQL · Render

**Base URL:** `https://bitespeed-api-84gw.onrender.com`

**Live Endpoint:** `POST https://bitespeed-api-84gw.onrender.com/identify`



---

## API

### `POST /identify`

**Request Body** (at least one field required):
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

**Response `200 OK`:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["primary@email.com", "secondary@email.com"],
    "phoneNumbers": ["123456", "789012"],
    "secondaryContactIds": [2, 3]
  }
}
```

---

## Testing the Live API

### Postman

1. Method: **POST** → URL: `https://bitespeed-api-84gw.onrender.com/identify`
2. Body → **raw** → **JSON** → paste any body below → **Send**

---

### Edge Cases & Scenarios

#### ✅ Case 1 — Brand new contact (no matches in DB)
Creates a new primary contact.

```bash
curl -X POST https://bitespeed-api-84gw.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}'
```
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["lorraine@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

---

#### ✅ Case 2 — Same phone, new email (linked to existing primary)
Creates a secondary contact linked to the existing primary.

```bash
curl -X POST https://bitespeed-api-84gw.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"mcfly@hillvalley.edu","phoneNumber":"123456"}'
```
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

---

#### ✅ Case 3 — Query by one field only (email or phone, not both)
Returns the full linked identity even when only one field is provided.

```bash
curl -X POST https://bitespeed-api-84gw.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"lorraine@hillvalley.edu"}'
```
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

---

#### ✅ Case 4 — Exact duplicate request (already exists)
No new contact is created. Returns existing identity unchanged.

```bash
curl -X POST https://bitespeed-api-84gw.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}'
```
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

---

#### ✅ Case 5 — Two separate primaries that now share info (merge)
If contact A and contact B were separate primaries, and a request comes in linking them, the older one becomes the final primary. The newer one and all its children are re-linked to the older primary.

```bash
# First, create contact A (primary 1)
curl -X POST https://bitespeed-api-84gw.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"george@hillvalley.edu","phoneNumber":"919191"}'

# Then, create contact B (primary 2 — different email + phone)
curl -X POST https://bitespeed-api-84gw.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"bifftannen@hillvalley.edu","phoneNumber":"717171"}'

# Now link them — same email as A, same phone as B
curl -X POST https://bitespeed-api-84gw.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"george@hillvalley.edu","phoneNumber":"717171"}'
```
```json
{
  "contact": {
    "primaryContactId": 3,
    "emails": ["george@hillvalley.edu", "bifftannen@hillvalley.edu"],
    "phoneNumbers": ["919191", "717171"],
    "secondaryContactIds": [4]
  }
}
```
> Contact 3 (george) was created first so it wins. Contact 4 (biff) becomes secondary.

---

#### ❌ Case 6 — Neither email nor phone provided
Returns an empty/undefined result or error depending on implementation.

```bash
curl -X POST https://bitespeed-api-84gw.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Running Locally

**Prerequisites:** Node.js v20+, PostgreSQL database

```bash
# 1. Clone and install
git clone https://github.com/richasingh-16/bitespeed-identity.git
cd bitespeed-identity
npm install

# 2. Create .env with your database connection
echo 'DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME"' > .env

# 3. Create the database table
npx prisma db push

# 4. Start dev server
npm run dev
# → Server running on port 3000

# 5. Test
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phoneNumber":"123456"}'
```

---

## How It Works

The `/identify` endpoint:

1. **Finds** all contacts matching the given email or phone
2. **Creates** a new primary contact if none exist
3. **Merges** multiple primaries — oldest wins, newer ones become secondary (via `prisma.$transaction`)
4. **Adds** a secondary contact if the email/phone combo is genuinely new
5. **Returns** a unified contact with all known emails, phones, and linked IDs

---

## Project Structure

```
├── prisma/schema.prisma       # Contact model definition
├── src/
│   ├── index.ts               # Express app + routes
│   ├── prisma.ts              # Prisma client singleton
│   └── services/
│       └── identify.service.ts  # Core reconciliation logic
├── dist/                      # Compiled JS (generated on build)
└── package.json
```

---

## Database Schema

```prisma
model Contact {
  id             Int       @id @default(autoincrement())
  email          String?
  phoneNumber    String?
  linkedId       Int?               // null for primary, points to primary for secondary
  linkPrecedence String             // "primary" | "secondary"
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
}
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with hot-reload (ts-node-dev) |
| `npm run build` | `prisma generate` + `tsc` |
| `npm start` | Run compiled JS (production) |

---

## Deployment

Deployed on Render with:
- **Build:** `npm install && npx prisma migrate deploy && npm run build`
- **Start:** `npm start`
- **Env var:** `DATABASE_URL`
