# @carhensi/aws-cdk-cloudfront-key-pair

[![npm version](https://badge.fury.io/js/@carhensi%2Faws-cdk-cloudfront-key-pair.svg)](https://badge.fury.io/js/@carhensi%2Faws-cdk-cloudfront-key-pair)
[![Build Status](https://github.com/carhensi/aws-cdk-cloudfront-key-pair/workflows/build/badge.svg)](https://github.com/carhensi/aws-cdk-cloudfront-key-pair/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Security](https://snyk.io/test/github/carhensi/aws-cdk-cloudfront-key-pair/badge.svg)](https://snyk.io/test/github/carhensi/aws-cdk-cloudfront-key-pair)

AWS CDK L3 construct for managing [CloudFront](https://aws.amazon.com/cloudfront) trusted key
group [key pairs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-trusted-signers.html).

## Features

- 🔐 **Secure Key Generation**: Generates 2048-bit RSA key pairs using Node.js 24
- 🏗️ **ARM64 Optimized**: Lambda functions run on ARM64 architecture for better performance
- 🔒 **AWS Secrets Manager**: Stores keys securely with cross-region replication support
- 🚀 **Modern Stack**: Built with TypeScript 5.7, CDK 2.233+, and comprehensive Jest testing
- 📦 **Easy Integration**: Simple CDK construct interface

This construct library extends CloudFormation capabilities by enabling you to easily provision and manage CloudFront
trusted group key pairs for restricting access to your CloudFront distribution's origins using signed URLs.

## Installation

To install and use this package, install the following packages using your package manager (e.g. npm):

- @carhensi/aws-cdk-cloudfront-key-pair
- aws-cdk-lib (^2.233.0)
- constructs (^10.0.0)

```sh
npm install @carhensi/aws-cdk-cloudfront-key-pair --save
```

## Usage

### Basic Example

```ts
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { CloudFrontKeyPair } from '@carhensi/aws-cdk-cloudfront-key-pair';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Create the key pair
    const keyPair = new CloudFrontKeyPair(this, 'CloudFrontKeyPair', {
      keyPairName: 'my-app-keypair',
      keyPairDescription: 'Key pair for signed URLs',
      // Optional: replicate secrets to other regions
      secretRegions: ['us-west-2', 'eu-west-1'],
    });

    // 2. Create a key group with the public key
    const keyGroup = new cloudfront.KeyGroup(this, 'KeyGroup', {
      items: [keyPair.publicKey],
      comment: 'Key group for private content',
    });

    // 3. Create CloudFront distribution with signed URLs
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(myBucket),
        trustedKeyGroups: [keyGroup],
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });
  }
}
```

### Configuration Options

```ts
new CloudFrontKeyPair(this, 'KeyPair', {
  keyPairName: 'my-keypair',                 // Required: Name prefix for secrets
  keyPairDescription: 'My key pair',         // Required: Description
  keyType: 'RSA_2048',                       // Optional: 'RSA_2048' (default) or 'ECDSA_256'
  secretRegions: ['us-west-2'],              // Optional: Cross-region replication
  architecture: lambda.Architecture.ARM_64,  // Optional: Lambda architecture (default: ARM64)
});
```

| Key Type | Use Case |
|----------|----------|
| `RSA_2048` | Default, broader library compatibility |
| `ECDSA_256` | Smaller signatures, faster signing, modern crypto |

### Accessing Keys for Signing URLs

The keys are automatically stored in AWS Secrets Manager:

| Key Type | Secret Name Pattern        | Example                    |
| -------- | -------------------------- | -------------------------- |
| Public   | `{keyPairName}/public`     | `my-keypair/public`        |
| Private  | `{keyPairName}/private`    | `my-keypair/private`       |

#### Using AWS CLI
```sh
# Get private key for signing
aws secretsmanager get-secret-value \
  --secret-id my-keypair/private \
  --query SecretString \
  --output text
```

#### Using AWS SDK (Node.js)
```ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });
const command = new GetSecretValueCommand({ SecretId: 'my-keypair/private' });
const response = await client.send(command);
const privateKey = response.SecretString;

// Use with CloudFront URL signing libraries
```

### Granting Access (L3 Pattern)

```ts
// Grant a Lambda function access to sign URLs
keyPair.grantReadPrivateKey(mySigningFunction);

// Grant access to read the public key
keyPair.grantReadPublicKey(myVerificationFunction);
```

### Best Practices

- **Cross-Region Replication**: Use `secretRegions` for multi-region applications
- **IAM Permissions**: Grant minimal permissions to access only required secrets
- **Key Rotation**: Consider implementing key rotation for long-lived applications
- **Monitoring**: Set up CloudWatch alarms for secret access patterns

### Common Use Cases

1. **Private Content Delivery**: Restrict access to premium content
2. **Time-Limited Access**: Generate expiring URLs for temporary access
3. **User-Specific Content**: Create personalized signed URLs
4. **API Protection**: Secure API endpoints behind CloudFront

## Acknowledgments

This project is based on the original work by [balzanelli](https://github.com/balzanelli/aws-cdk-cloudfront-key-pair) and [Enrico Bertolotti](https://github.com/enricobertolotti). Thanks for the solid foundation! 🙏

## License

MIT License - see [LICENSE](LICENSE) file for details.
