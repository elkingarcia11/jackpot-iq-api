# Jackpot IQ API - Production Deployment Guide

This guide provides instructions for deploying the Jackpot IQ API in a production environment using Docker.

## Prerequisites

- Docker and Docker Compose installed on your server
- Node.js 16+ (for local testing only)
- Access to your Apple Developer account for App Attest setup

## Environment Setup

1. Copy the example environment file to create your production configuration:

```bash
cp .env.example .env
```

2. Edit `.env` and set all required values:

```
# Server Configuration
NODE_ENV=production

# JWT Configuration
JWT_SECRET=<generate_a_strong_random_secret>
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500

# Apple App Attest
APPLE_ROOT_CA=<base64_encoded_apple_root_certificate>
APPLE_TEAM_ID=<your_apple_team_id>
APPLE_BUNDLE_ID=<your_app_bundle_id>

# Google Cloud Storage
USE_GCS=true
GCS_BUCKET=jackpot-iq
GCS_DIRECTORY=
GCS_DATA_PREFIX=data/
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account-key.json
```

## Security Enhancements

The API includes several security enhancements for production:

1. **Production Error Handling**: Error details are hidden in production to prevent information disclosure
2. **Logging**: Uses Morgan 'combined' format in production for more detailed logs
3. **HTTP Headers**: Helmet is used to set secure headers
4. **Caching Strategy**: Intelligent caching based on data update patterns
5. **Rate Limiting**: Protects against abuse and DoS attacks

## Google Cloud Storage Setup

1. Create a Google Cloud Storage bucket named `jackpot-iq` (or use an existing one)
2. Create a service account with Storage Object Admin permissions
3. Download the service account key JSON file
4. Set the path to the service account key file in `GOOGLE_APPLICATION_CREDENTIALS`
5. Upload the initial data files directly to your bucket in the directory specified by `GCS_DATA_PREFIX` (default: `data/`):
   - `data/mm.json` - Mega Millions draw history
   - `data/pb.json` - Powerball draw history
   - `data/mm-stats.json` - Mega Millions statistics
   - `data/pb-stats.json` - Powerball statistics

The application will look for files in the directory specified by the `GCS_DATA_PREFIX` environment variable within your bucket. If this variable is not set, it defaults to "data/".

If the app can't connect to Google Cloud Storage, it will fall back to local files in the `data` directory.

## Docker Deployment

Run the application using Docker Compose:

```bash
docker-compose up -d
```

## Cloud Run Deployment

For deploying to Google Cloud Run, refer to the "Cloud Hosting Migration" section in the README.md file.
