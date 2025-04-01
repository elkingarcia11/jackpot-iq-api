# Jackpot IQ API

A secure REST API for lottery number generation and analysis, built with Node.js, Express, and Firebase.

## Features

- Secure authentication using Apple App Attest
- Lottery draw history and search
- Random number generation
- Optimized number generation based on historical statistics
- Real-time statistics and analysis
- Rate limiting and security measures

## Prerequisites

- Node.js (v14 or higher)
- Firebase project with Firestore database
- Apple Developer account for App Attest

## Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/jackpot-iq-api.git
cd jackpot-iq-api
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

- Firebase configuration
- JWT secret
- Apple App Attest credentials
- Rate limiting settings

5. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## API Documentation

### Authentication

#### GET /api/auth/challenge

Generate a challenge for App Attest verification.

#### POST /api/auth/verify

Verify App Attest and receive a JWT token.

### Lottery Draws

#### GET /api/lottery-draws

Get latest lottery draws with pagination.

Query Parameters:

- `type`: "megamillion" or "powerball"
- `offset`: Pagination offset (default: 0)
- `limit`: Number of draws to return (default: 20)

#### POST /api/lottery-draws/search

Search for specific lottery draws.

Request Body:

```json
{
  "type": "megamillion",
  "numbers": [5, 12, 19, 27, 35],
  "specialBall": 7 // optional
}
```

#### GET /api/lottery-draws/generate-random

Generate random lottery numbers.

Query Parameters:

- `type`: "megamillion" or "powerball"

#### GET /api/lottery-draws/generate-optimized

Generate optimized lottery numbers based on historical statistics.

Query Parameters:

- `type`: "megamillion" or "powerball"

### Statistics

#### GET /api/stats/:type

Get statistics for a specific lottery type.

Path Parameters:

- `type`: "megamillion" or "powerball"

## Security

- All endpoints require authentication via JWT token
- Rate limiting is implemented to prevent abuse
- Input validation and sanitization
- Secure headers with Helmet
- CORS protection
- Compression for responses

## Error Handling

The API uses standard HTTP status codes:

- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## Development

### Running Tests

```bash
npm test
```

### Code Style

The project uses ESLint for code linting. Run:

```bash
npm run lint
```

## License

MIT
