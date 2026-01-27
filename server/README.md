# LawPal API Server

Professional Modular Backend for LawPal.

## 🏗 Architecture

The server is now organized following modular best practices:

- **routes/**: API route definitions separated by domain (Auth, Chat, Lawyer, etc.)
- **middleware/**: Reusable logic like authentication and validation.
- **models/**: Mongoose schemas for data persistence.
- **server.js**: Entry point, initializes middleware, database, and routes.

## 🔒 Security & Performance

- **Rate Limiting**: Protected against brute force and spam.
- **Validation**: Strict ObjectID validation for all dynamic parameters.
- **Error Handling**: Centralized JSON-based error responses.
- **CORS**: Securely configured for frontend interaction.

## 🚀 Getting Started

1. Install dependencies: `npm install`
2. Configure `.env`
3. Start server: `npm start`
