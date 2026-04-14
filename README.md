# AF-GO-BACKEND

A Node.js/Express REST API backend with JWT-based authentication and role-based access control.

---

## Tech Stack

| Layer | Package | Purpose |
|---|---|---|
| Runtime | Node.js >= 18 | JavaScript runtime |
| Framework | Express 5 | HTTP server & routing |
| Database | MongoDB + Mongoose 9 | Data persistence & ODM |
| Authentication | jsonwebtoken | JWT signing & verification |
| Password hashing | bcryptjs | Secure password storage |
| Validation | express-validator | Request input validation |
| Config | dotenv | Environment variable loading |
| CORS | cors | Cross-origin request handling |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- A MongoDB instance (local or [Atlas](https://www.mongodb.com/atlas))

### 1. Clone & install

```bash
git clone <repo-url>
cd AF-GO-BACKEND
npm install
```

### 2. Configure environment

Create a `.env` file at the project root:

```env
NODE_ENV=development
PORT=3000

MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/africago

API_VERSION=v1

JWT_SECRET=your_strong_secret_here
JWT_EXPIRES_IN=15m

CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign tokens (keep private) |
| `JWT_EXPIRES_IN` | Token lifetime — e.g. `15m`, `1h`, `7d` |
| `PORT` | Port the server listens on (default `3000`) |
| `CORS_ORIGIN` | Comma-separated list of allowed origins |

### 3. Run

```bash
npm start
```

Server starts at `http://localhost:3000`.

---

## Project Structure

```
AF-GO-BACKEND/
├── configs/
│   └── db.js                 # MongoDB connection
├── controllers/
│   └── auth.controller.js    # register & login handlers
├── middlewares/
│   └── auth.middleware.js    # JWT auth + role guards
├── models/
│   └── User.js               # User Mongoose schema
├── routes/
│   └── auth.routes.js        # Auth route definitions
├── services/                 # Business logic (future use)
├── docs/
│   └── AUTH.md               # Full auth API reference
├── index.js                  # App entry point
├── package.json
└── .env
```

---

## API Endpoints

Base path: `/api/v1`

### `GET /api/v1/health`

Check that the server is running.

**Response `200`**
```json
{
  "success": true,
  "status": "ok",
  "environment": "development",
  "timestamp": "2026-04-14T10:00:00.000Z"
}
```

---

### `POST /api/v1/auth/register`

Create a new user account.

**Request body**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "Secret123",
  "role": "client"
}
```

| Field | Required | Rules |
|---|---|---|
| `username` | Yes | 3–30 chars, letters/numbers/underscores only |
| `email` | Yes | Valid email format |
| `password` | Yes | Min 8 chars, must include uppercase, lowercase, and a digit |
| `role` | No | `client` (default), `prestataire`, or `admin` |

**Response `201`**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "<jwt>",
  "user": {
    "id": "664f...",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "client",
    "createdAt": "2026-04-14T10:00:00.000Z"
  }
}
```

| Status | Reason |
|---|---|
| `422` | Validation failed |
| `409` | Email or username already exists |

---

### `POST /api/v1/auth/login`

Authenticate and receive a JWT.

**Request body**
```json
{
  "email": "john@example.com",
  "password": "Secret123"
}
```

> `email` or `identifier` (email **or** username) are both accepted.

**Response `200`**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "<jwt>",
  "user": {
    "id": "664f...",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "client",
    "createdAt": "2026-04-14T10:00:00.000Z"
  }
}
```

| Status | Reason |
|---|---|
| `422` | Validation failed |
| `401` | Invalid credentials |

---

## Using the JWT

Include the token from login/register in the `Authorization` header on all protected requests:

```
Authorization: Bearer <token>
```

### User roles

| Role | Description |
|---|---|
| `client` | Default end-user |
| `prestataire` | Service provider |
| `admin` | Full platform access |

### Protecting routes

```js
const { authenticate, isAdmin, authorize } = require('./middlewares/auth.middleware');

// Any authenticated user
router.get('/profile', authenticate, handler);

// Admin only
router.delete('/users/:id', authenticate, isAdmin, handler);

// Multiple roles
router.post('/services', authenticate, authorize('admin', 'prestataire'), handler);
```

---

## License

ISC
