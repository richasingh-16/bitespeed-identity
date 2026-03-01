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

### curl

```bash
# Step 1 — Create a new contact (becomes primary)
curl -X POST https://bitespeed-api-84gw.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}'

# Step 2 — Same phone, new email (creates a secondary contact)
curl -X POST https://bitespeed-api-84gw.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"mcfly@hillvalley.edu","phoneNumber":"123456"}'

# Step 3 — Query by original email (both emails now appear under one identity)
curl -X POST https://bitespeed-api-84gw.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"lorraine@hillvalley.edu"}'
```

**Expected response after Step 3:**
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

### Postman

1. Method: **POST** → URL: `https://bitespeed-api-84gw.onrender.com/identify`
2. Body → **raw** → **JSON**
3. Paste any request body from above → **Send**

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
