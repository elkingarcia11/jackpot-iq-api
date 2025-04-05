const cbor = require('cbor');
const crypto = require('crypto');
const https = require('https');
const asn1 = require('asn1.js');

class AppAttestService {
  constructor() {
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development';
    
    // In development mode, use mock values if environment variables are missing
    if (isDev && (!process.env.APPLE_ROOT_CA || !process.env.APPLE_TEAM_ID || !process.env.APPLE_BUNDLE_ID)) {
      console.warn('⚠️ Using mock Apple App Attest values in development mode. This will not work in production!');
      this.appleRootCA = Buffer.from('mockCertificateForDevelopment');
      this.teamId = process.env.APPLE_TEAM_ID || 'MOCK_TEAM_ID';
      this.bundleId = process.env.APPLE_BUNDLE_ID || 'com.example.app';
    } else {
      // In production, use the actual environment variables
      this.appleRootCA = Buffer.from(process.env.APPLE_ROOT_CA || '', 'base64');
      this.teamId = process.env.APPLE_TEAM_ID;
      this.bundleId = process.env.APPLE_BUNDLE_ID;
    }
    
    // Define ASN.1 structures for receipt parsing
    this.ReceiptASN = asn1.define('Receipt', function() {
      this.seq().obj(
        this.key('version').int(),
        this.key('signature').octstr(),
        this.key('receiptType').int(),
        this.key('receiptData').octstr(),
        this.key('deviceId').octstr()
      );
    });
  }

  /**
   * Verifies an Apple App Attest attestation
   * @param {Buffer} attestation - The attestation data
   * @param {string} challenge - The challenge string
   * @returns {Promise<{verified: boolean, deviceId: string}>}
   */
  async verifyAttestation(attestation, challenge) {
    try {
      // Decode the CBOR attestation
      const decodedAttestation = await cbor.decode(attestation);
      
      // Verify the attestation format
      if (!this.isValidAttestationFormat(decodedAttestation)) {
        return { verified: false };
      }

      // Verify the attestation signature
      const signatureVerified = await this.verifySignature(decodedAttestation);
      if (!signatureVerified) {
        return { verified: false };
      }

      // Verify the challenge
      const challengeVerified = this.verifyChallenge(decodedAttestation, challenge);
      if (!challengeVerified) {
        return { verified: false };
      }

      // Extract and verify the device ID
      const deviceId = this.extractDeviceId(decodedAttestation);
      if (!deviceId) {
        return { verified: false };
      }

      return {
        verified: true,
        deviceId
      };
    } catch (error) {
      console.error('Attestation verification error:', error);
      return { verified: false };
    }
  }

  /**
   * Validates the attestation format
   * @param {Object} attestation - Decoded attestation data
   * @returns {boolean}
   */
  isValidAttestationFormat(attestation) {
    // Check required fields
    return (
      attestation.fmt === 'apple-appattest' &&
      attestation.attStmt &&
      attestation.attStmt.x5c &&
      attestation.attStmt.x5c.length > 0 &&
      attestation.attStmt.receipt
    );
  }

  /**
   * Verifies the attestation signature using Apple's certificate chain
   * @param {Object} attestation - Decoded attestation data
   * @returns {Promise<boolean>}
   */
  async verifySignature(attestation) {
    try {
      const { x5c } = attestation.attStmt;
      
      // Verify the certificate chain
      const certChain = x5c.map(cert => Buffer.from(cert, 'base64'));
      const verified = await this.verifyCertificateChain(certChain);
      
      if (!verified) {
        return false;
      }

      // Verify the attestation signature
      const signature = Buffer.from(attestation.attStmt.sig, 'base64');
      const signedData = this.getSignedData(attestation);
      
      return crypto.verify(
        'sha256',
        signedData,
        {
          key: certChain[0],
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING
        },
        signature
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Verifies the certificate chain
   * @param {Buffer[]} certChain - Array of certificates
   * @returns {Promise<boolean>}
   */
  async verifyCertificateChain(certChain) {
    try {
      // Verify each certificate in the chain
      for (let i = 0; i < certChain.length - 1; i++) {
        const currentCert = certChain[i];
        const nextCert = certChain[i + 1];
        
        // Verify certificate is valid and not expired
        if (!this.isValidCertificate(currentCert)) {
          console.error('Certificate validation failed:', i);
          return false;
        }

        // Verify certificate is signed by the next certificate in chain
        if (!this.verifyCertificateSignature(currentCert, nextCert)) {
          console.error('Certificate signature verification failed:', i);
          return false;
        }
      }

      // Verify the last certificate is signed by Apple's root CA
      const lastCert = certChain[certChain.length - 1];
      if (!this.verifyCertificateSignature(lastCert, this.appleRootCA)) {
        console.error('Root CA verification failed');
        return false;
      }

      // Verify the leaf certificate is for our app
      const leafCert = certChain[0];
      if (!this.verifyLeafCertificate(leafCert)) {
        console.error('Leaf certificate verification failed');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Certificate chain verification error:', error);
      return false;
    }
  }

  /**
   * Checks if a certificate is valid and not expired
   * @param {Buffer} cert - Certificate buffer
   * @returns {boolean}
   */
  isValidCertificate(cert) {
    try {
      const certObj = new crypto.X509Certificate(cert);
      const now = Date.now();
      
      // Check if certificate is expired
      if (now < certObj.validFrom.getTime() || now > certObj.validTo.getTime()) {
        return false;
      }

      // Check if certificate is revoked (optional)
      // This would require implementing OCSP checking
      
      return true;
    } catch (error) {
      console.error('Certificate validation error:', error);
      return false;
    }
  }

  /**
   * Verifies that a certificate is signed by another certificate
   * @param {Buffer} cert - Certificate to verify
   * @param {Buffer} signingCert - Certificate that should have signed the first certificate
   * @returns {boolean}
   */
  verifyCertificateSignature(cert, signingCert) {
    try {
      const certObj = new crypto.X509Certificate(cert);
      const signingCertObj = new crypto.X509Certificate(signingCert);
      
      return crypto.verify(
        'sha256',
        certObj.signature,
        {
          key: signingCertObj.publicKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING
        },
        certObj.signature
      );
    } catch (error) {
      console.error('Certificate signature verification error:', error);
      return false;
    }
  }

  /**
   * Verifies that the leaf certificate is for our app
   * @param {Buffer} cert - Leaf certificate
   * @returns {boolean}
   */
  verifyLeafCertificate(cert) {
    try {
      const certObj = new crypto.X509Certificate(cert);
      
      // Check if certificate is issued by Apple
      if (!certObj.issuer.includes('Apple')) {
        return false;
      }

      // Check if certificate is for our app
      const subject = certObj.subject;
      if (!subject.includes(this.bundleId)) {
        return false;
      }

      // Check if certificate is for our team
      if (!subject.includes(this.teamId)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Leaf certificate verification error:', error);
      return false;
    }
  }

  /**
   * Verifies that the challenge matches the attestation
   * @param {Object} attestation - Decoded attestation data
   * @param {string} challenge - The challenge string
   * @returns {boolean}
   */
  verifyChallenge(attestation, challenge) {
    const nonce = attestation.authData.slice(32, 64);
    const expectedNonce = crypto.createHash('sha256')
      .update(challenge)
      .digest();
    
    return nonce.equals(expectedNonce);
  }

  /**
   * Extracts the device ID from the attestation
   * @param {Object} attestation - Decoded attestation data
   * @returns {string|null}
   */
  extractDeviceId(attestation) {
    try {
      const receipt = Buffer.from(attestation.attStmt.receipt, 'base64');
      
      // Parse the ASN.1 receipt
      const decodedReceipt = this.ReceiptASN.decode(receipt, 'der');
      
      // Extract the device ID
      const deviceId = decodedReceipt.deviceId.toString('hex');
      
      // Verify the device ID format
      if (!this.isValidDeviceId(deviceId)) {
        console.error('Invalid device ID format');
        return null;
      }

      return deviceId;
    } catch (error) {
      console.error('Device ID extraction error:', error);
      return null;
    }
  }

  /**
   * Validates the device ID format
   * @param {string} deviceId - Device ID to validate
   * @returns {boolean}
   */
  isValidDeviceId(deviceId) {
    // Device ID should be a 32-byte (64 character) hex string
    return /^[0-9a-f]{64}$/i.test(deviceId);
  }

  /**
   * Gets the data that was signed in the attestation
   * @param {Object} attestation - Decoded attestation data
   * @returns {Buffer}
   */
  getSignedData(attestation) {
    const authenticatorData = attestation.authData;
    const clientDataHash = attestation.attStmt.clientDataHash;
    
    return Buffer.concat([
      authenticatorData,
      clientDataHash
    ]);
  }
}

module.exports = new AppAttestService(); 