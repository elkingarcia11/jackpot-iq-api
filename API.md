# Lottery API Documentation

## Authentication

All endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Authentication Endpoints

### Get App Attest Challenge

Generates a random challenge for App Attest verification.

**Endpoint:** `GET /api/auth/app-attest-challenge`

**Response:**

```json
{
  "challenge": "base64_encoded_challenge_string"
}
```

**Error Response:**

```json
{
  "error": "Failed to generate challenge"
}
```

### Verify Attestation

Verifies the Apple App Attest attestation and returns a JWT token.

**Endpoint:** `POST /api/auth/verify-attestation`

**Request Body:**

```json
{
  "attestation": "base64_encoded_attestation",
  "challenge": "challenge_string",
  "keyID": "key_identifier"
}
```

**Response:**

```json
{
  "token": "jwt_token_string"
}
```

**Error Response:**

```json
{
  "error": "Invalid attestation"
}
```

## Statistics Endpoints

### Get Lottery Statistics

Retrieves comprehensive statistics for a specific lottery type, including frequency analysis and position-based frequency.

**Endpoint:** `GET /api/stats`

**Query Parameters:**

- `type` (required): The type of lottery (`mega-millions` or `powerball`)

**Response:**

```json
{
  "totalDraws": 250,
  "frequency": {
    "1": 15,
    "2": 30,
    "3": 21
    // ... numbers up to 70 for Mega Millions or 69 for Powerball
  },
  "frequencyAtPosition": {
    "0": {
      "1": 5,
      "2": 10,
      "3": 8
      // ... numbers at first position
    },
    "1": {
      // ... numbers at second position
    }
    // ... remaining positions
  },
  "specialBallFrequency": {
    "1": 13,
    "2": 18,
    "3": 15
    // ... special ball numbers up to 25 for Mega Millions or 26 for Powerball
  }
}
```

**Error Response:**

```json
{
  "error": "Failed to retrieve statistics"
}
```

## Lottery Endpoints

### Get Latest Lottery Draws

Returns the most recent lottery draws.

**Endpoint:** `GET /api/lottery`

**Query Parameters:**

- `type` (required): The type of lottery (`mega-millions` or `powerball`)
- `limit` (optional): Maximum number of draws to return (default: 10)
- `offset` (optional): Number of draws to skip (for pagination) (default: 0)

**Response:**

```json
[
  {
    "specialBall": 3,
    "date": "2023-04-01",
    "numbers": [11, 12, 21, 29, 49],
    "type": "mega-millions"
  },
  {
    "specialBall": 23,
    "date": "2023-03-28",
    "numbers": [2, 9, 31, 60, 63],
    "type": "mega-millions"
  }
]
```

**Error Response:**

```json
{
  "error": "Failed to retrieve lottery draws"
}
```

### Search Lottery Draws

Search for specific lottery draws by numbers and/or special ball.

**Endpoint:** `GET /api/lottery/search`

**Query Parameters:**

- `type` (required): The type of lottery (`mega-millions` or `powerball`)
- `numbers` (optional): Comma-separated list of numbers to search for
- `specialBall` (optional): Special ball number to search for

**Example:** `/api/lottery/search?type=mega-millions&numbers=1,2,3,4,5&specialBall=10`

**Response:**

```json
[
  {
    "specialBall": 10,
    "date": "2023-01-10",
    "numbers": [1, 2, 3, 4, 5],
    "type": "mega-millions"
  }
]
```

**Error Response:**

```json
{
  "errors": [
    {
      "location": "query",
      "msg": "Invalid value",
      "param": "specialBall"
    }
  ]
}
```

### Generate Random Numbers

Generate random lottery numbers for a specific lottery type.

**Endpoint:** `GET /api/lottery/generate-random`

**Query Parameters:**

- `type` (required): The type of lottery (`mega-millions` or `powerball`)

**Response:**

```json
{
  "type": "mega-millions",
  "numbers": [7, 23, 34, 51, 69],
  "specialBall": 7
}
```

**Error Response:**

```json
{
  "error": "Failed to generate random numbers"
}
```

## Common Error Responses

### 400 Bad Request

```json
{
  "errors": [
    {
      "msg": "Invalid lottery type",
      "param": "type",
      "location": "query"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": "No token provided"
}
```

### 500 Internal Server Error

In production:

```json
{
  "error": "Failed to retrieve lottery draws"
}
```

In development:

```json
{
  "error": "Failed to retrieve lottery draws",
  "details": "Detailed error message",
  "stack": "Error stack trace"
}
```
