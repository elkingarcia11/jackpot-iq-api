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
PORT=3000
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
```

## Apple App Attest Setup

1. Register your app in the Apple Developer portal
2. Enable App Attest for your app
3. Get your team ID from the Apple Developer portal
4. Set your app's bundle ID in the environment config
5. Obtain Apple's root CA certificate and encode it in base64

### Securely Handling App Attestation Credentials

For the Apple App Attestation root certificate, download it from Apple's servers and convert it to base64:

```bash
# Download the certificate (if needed)
curl -o AppleAppAttestRootCA.pem https://www.apple.com/certificateauthority/AppleAppAttestRootCA.pem

# Convert to base64 format
cat AppleAppAttestRootCA.pem | base64 -w 0 > apple_root_ca.base64.txt
```

Then securely add this to your environment:

1. Store these credentials in a secure environment variable management system (like AWS Secrets Manager, HashiCorp Vault, or Docker secrets)
2. NEVER commit these credentials to version control or include them in Docker images
3. Consider using runtime secret injection rather than environment files
4. If using Kubernetes, use Secrets for storing these values

#### Credentials Security Checklist

- [ ] Apple Root CA certificate is base64 encoded and stored securely
- [ ] Team ID and Bundle ID are protected from unauthorized access
- [ ] Environment files containing credentials are in `.gitignore`
- [ ] Production deploy scripts do not output or log these credentials
- [ ] Rotate or refresh credentials according to your security policy

## Building and Deploying

1. Build and start the Docker container:

```bash
docker-compose up -d --build
```

2. Verify the application is running:

```bash
docker-compose logs
```

3. Test the API (the app-attest-challenge endpoint doesn't require authentication):

```bash
curl http://your-server:3000/api/auth/app-attest-challenge
```

## Security Considerations

1. **JWT Secret**: Use a strong, randomly generated secret
2. **Authentication**: All endpoints are protected by JWT authentication
3. **Data Persistence**: The `/data` directory is mounted as a volume for persistence
4. **Firewall**: Configure your server's firewall to allow only traffic on port 3000
5. **HTTPS**: Set up a reverse proxy (like Nginx) to handle HTTPS

## Maintenance

- **Logs**: View container logs with `docker-compose logs -f`
- **Restart**: Restart the service with `docker-compose restart`
- **Update**: Pull the latest code and rebuild with `docker-compose up -d --build`

## Troubleshooting

1. **Authentication Issues**: Verify your Apple App Attest configuration
2. **Data Persistence**: Check that the data directory has correct permissions
3. **API Errors**: Check container logs for detailed error messages

## Production Checklist

- [ ] Set a strong JWT secret
- [ ] Configure proper Apple App Attest settings
- [ ] Set up HTTPS with a valid SSL certificate
- [ ] Configure backup solution for the data directory
- [ ] Set up monitoring and alerts
- [ ] Test authentication flow with a real iOS device
