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

### Lottery Endpoints

#### Get Latest Lottery Draws

```
GET /api/lottery?type=mega-millions&limit=10&offset=0
```

Query Parameters:

- `type`: "mega-millions" or "powerball"
- `limit`: Maximum number of draws to return (default: 10)
- `offset`: Number of draws to skip (for pagination) (default: 0)

#### Search Lottery Draws

```
POST /api/lottery/search
```

Request Body:

```json
{
  "type": "mega-millions",
  "numbers": [1, 2, 3, 4, 5],
  "specialBall": 10
}
```

Validation Rules:

- `type`: "mega-millions" or "powerball"
- For Mega Millions:
  - Numbers must be between 1 and 70
  - Special ball must be between 1 and 25
- For Powerball:
  - Numbers must be between 1 and 69
  - Special ball must be between 1 and 26

#### Generate Random Numbers

```
GET /api/lottery/generate-random?type=mega-millions
```

Query Parameters:

- `type`: "mega-millions" or "powerball"

### Statistics Endpoints

#### Get Lottery Statistics

```
GET /api/stats?type=mega-millions
```

Query Parameters:

- `type`: "mega-millions" or "powerball"

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

## Local Development

### Running without Authentication

For local development, the API can be run without App Attest authentication. This makes it easier to test your endpoints without setting up the attestation process.

1. Make sure `NODE_ENV=development` is set in your `.env` file
2. Start the server: `npm run dev`
3. The auth middleware will automatically bypass token verification

To get a development token for testing:

```
GET /api/auth/dev-token
```

This endpoint returns a JWT token that you can use for all authenticated endpoints. Use it by adding the following header to your requests:

```
Authorization: Bearer <token>
```

All other endpoints will work normally, but without requiring actual authentication.

## License

MIT
