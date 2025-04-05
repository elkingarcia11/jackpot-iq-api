# Lottery API Documentation

## Authentication

All endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Authentication Endpoints

### Verify App Attest

Verifies the Apple App Attest attestation for iOS devices.

**Endpoint:** `POST /api/auth/verify-app-attest`

**Request Body:**

```json
{
  "attestation": "base64_encoded_attestation",
  "challenge": "random_challenge_string"
}
```

**Response:**

```json
{
  "verified": true,
  "deviceId": "unique_device_identifier"
}
```

**Error Response:**

```json
{
  "error": "Invalid attestation"
}
```

### Generate JWT Token

Generates a JWT token for authenticated clients.

**Endpoint:** `POST /api/auth/token`

**Request Body:**

```json
{
  "deviceId": "unique_device_identifier"
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
  "error": "Invalid device ID"
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
  "totalDraws": 250, // Each new lottery draw updates total draws by 1
  "frequency": {
    // Tracks how many time each number has appeared in a draw
    "1": 15,
    "2": 30,
    "3": 21,
    "4": 28,
    "5": 19,
    "6": 25,
    "7": 22,
    "8": 17,
    "9": 24,
    "10": 20
    // ... numbers up to 70 for Mega Millions or 69 for Powerball
  },
  "frequencyAtPosition": {
    // Tracks how many time each number has appeared in a draw at a specific position
    "0": {
      "1": 5,
      "2": 10,
      "3": 8
      // ... numbers at first position
    },
    "1": {
      "3": 8,
      "4": 12,
      "5": 6
      // ... numbers at second position
    },
    "2": {
      "7": 9,
      "8": 11,
      "9": 7
      // ... numbers at third position
    },
    "3": {
      "12": 10,
      "13": 8,
      "14": 15
      // ... numbers at fourth position
    },
    "4": {
      "25": 13,
      "26": 9,
      "27": 11
      // ... numbers at fifth position
    },
    "5": {
      "35": 9,
      "36": 7,
      "37": 12
      // ... special ball numbers
    }
  },
  "specialBallFrequency": {
    // Tracks how many time each number has appeared in a draw as a special ball
    "10": 13,
    "11": 18,
    "12": 15
    // ... special ball numbers up to 25 for Mega Millions or 26 for Powerball
  },
  "optimizedByPosition": [2, 17, 31, 38, 50, 3],
  "optimizedByGeneralFrequency": [10, 17, 20, 31, 46, 3]
}
```

**Error Response:**

```json
{
  "error": "Failed to fetch statistics"
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

**Endpoint:** `POST /api/lottery/search`

**Request Body:**

```json
{
  "type": "mega-millions",
  "numbers": [1, 2, 3, 4, 5],
  "specialBall": 10
}
```

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
      "location": "body",
      "msg": "Numbers must be integers between 1 and 70",
      "param": "numbers"
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
  "error": "Invalid or missing token"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```
