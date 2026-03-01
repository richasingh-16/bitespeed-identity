# BiteSpeed Identity Reconciliation API

This project implements an identity reconciliation system that links customer contacts based on shared email addresses and phone numbers. The system ensures that duplicate records are merged correctly, the oldest contact remains primary, and secondary contacts are linked appropriately. Built using Node.js, TypeScript, Prisma ORM, and PostgreSQL, and deployed on Render.

## 🚀 Live API

Base URL:
https://bitespeed-api-84gw.onrender.com

POST Endpoint:
https://bitespeed-api-84gw.onrender.com/identify

---

## 🛠 Tech Stack

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Render (Deployment)

---

## 📌 API Endpoint

### POST /identify

Request Body (JSON):

{
  "email": "string | optional",
  "phoneNumber": "string | optional"
}

At least one of email or phoneNumber must be provided.

---

## ✅ Response Format

{
  "contact": {
    "primaryContactId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}

---

## 🔍 Example Request

{
  "email": "alpha@test.com",
  "phoneNumber": "11111"
}

---

## ⚙️ Local Setup

1. Clone repo
2. Install dependencies

npm install

3. Setup environment variable

Create .env file:

DATABASE_URL=your_postgres_connection_string

4. Run migrations

npx prisma migrate deploy

5. Build and start

npm run build
npm start

---

## 🧠 Features

- Primary & Secondary contact linking
- Collision merge handling
- Idempotent behavior
- Oldest contact becomes primary
- Atomic reconciliation logic

---
