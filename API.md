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

- `type` (required): The type of lottery (`megamillion` or `powerball`)

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
  }
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

Retrieves the latest lottery draws for a specific lottery type.

**Endpoint:** `GET /api/lottery`

**Query Parameters:**

- `type` (required): The type of lottery (`megamillion` or `powerball`)
- `offset` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum number of records to return (default: 20, max: 100)

**Response:**

```json
[
  {
    "id": "2024-03-31",
    "type": "megamillion",
    "numbers": [5, 12, 19, 27, 35],
    "specialBall": 7
  }
  // ... more draws
]
```

**Error Response:**

```json
{
  "error": "Failed to fetch draws"
}
```

### Search Lottery Draws

Searches for specific lottery draws matching the provided numbers and special ball.

**Endpoint:** `POST /api/lottery/search`

**Request Body:**

```json
{
  "type": "megamillion",
  "numbers": [5, 12, 19, 27, 35],
  "specialBall": 7
}
```

**Validation Rules:**

- For Mega Millions:
  - Numbers must be between 1 and 70
  - Special ball must be between 1 and 25
- For Powerball:
  - Numbers must be between 1 and 69
  - Special ball must be between 1 and 26

**Response:**

```json
[
  {
    "id": "2024-03-31",
    "type": "megamillion",
    "numbers": [5, 12, 19, 27, 35],
    "specialBall": 7
  }
]
```

**Error Response:**

```json
{
  "errors": [
    {
      "msg": "Numbers must be between 1 and 70",
      "param": "numbers.0",
      "location": "body"
    }
  ]
}
```

### Generate Random Numbers

Generates random lottery numbers that haven't been drawn before.

**Endpoint:** `GET /api/lottery/generate-random`

**Query Parameters:**

- `type` (required): The type of lottery (`megamillion` or `powerball`)

**Response:**

```json
{
  "numbers": [5, 12, 19, 27, 35],
  "specialBall": 7
}
```

**Error Response:**

```json
{
  "error": "Failed to generate numbers"
}
```

### Generate Optimized Numbers

Generates lottery numbers based on historical frequency analysis.

**Endpoint:** `GET /api/lottery/generate-optimized`

**Query Parameters:**

- `type` (required): The type of lottery (`megamillion` or `powerball`)

**Response:**

```json
{
  "numbers": [5, 12, 19, 27, 35],
  "specialBall": 7
}
```

**Error Response:**

```json
{
  "error": "Failed to generate optimized numbers"
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
