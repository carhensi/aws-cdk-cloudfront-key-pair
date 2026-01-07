# @carhensi/aws-cdk-cloudfront-key-pair

[![npm version](https://badge.fury.io/js/@carhensi%2Faws-cdk-cloudfront-key-pair.svg)](https://badge.fury.io/js/@carhensi%2Faws-cdk-cloudfront-key-pair)
[![Build Status](https://github.com/carhensi/aws-cdk-cloudfront-key-pair/workflows/build/badge.svg)](https://github.com/carhensi/aws-cdk-cloudfront-key-pair/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

```ts
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import {CloudFrontKeyPair} from '@carhensi/aws-cdk-cloudfront-key-pair';

// Generate an RSA key pair and create a CloudFront public key with the contents.
const {publicKey} = new CloudFrontKeyPair(this, 'CloudFrontKeyPair', {
  name: 'cloudfront-key-pair',
  description: 'CloudFront Key Pair',
});

// Create a CloudFront key group and assign the created CloudFront public key.
const keyGroup = new cloudfront.KeyGroup(this, 'KeyGroup', {
  items: [publicKey],
});
```

The public and private keys are stored in AWS Secrets Manager. The secrets are prefixed with the `name` used for the
CloudFront key pair, with a suffix to distinguish between each key type, these being `/public` and `/private`. For the
above example, the secrets are named:

| Key Type | Secret Name                 |
| -------- | --------------------------- |
| Public   | cloudfront-key-pair/public  |
| Private  | cloudfront-key-pair/private |

You can retrieve the above keys from AWS Secrets Manager by using the AWS CLI or alternatively from your application
using the AWS SDK for signing URLs:

```sh
aws secretsmanager get-secret-value \
  --secret-id cloudfront-key-pair/private \
  --query SecretString \
  --output text
```

## Acknowledgments

This project is based on the original work by [balzanelli](https://github.com/balzanelli/aws-cdk-cloudfront-key-pair) and [Enrico Bertolotti](https://github.com/enricobertolotti). Thanks for the solid foundation! 🙏

## License

MIT License - see [LICENSE](LICENSE) file for details.
