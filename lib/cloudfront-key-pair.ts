import { CustomResource, Duration, Stack } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';
import { CloudFrontKeyPairProps } from './cloudfront-key-pair-props';

export class CloudFrontKeyPair extends Construct {
  /** CloudFront public key for use in KeyGroups */
  readonly publicKey: cloudfront.PublicKey;

  /** Secret containing the private key for signing URLs */
  readonly privateKeySecret: secretsmanager.ISecret;

  /** Secret containing the public key */
  readonly publicKeySecret: secretsmanager.ISecret;

  private readonly props: CloudFrontKeyPairProps;

  constructor(scope: Construct, id: string, props: CloudFrontKeyPairProps) {
    super(scope, id);
    this.props = props;
    this.validateProps();

    const keyPair = this.createKeyPairResource();

    this.publicKey = new cloudfront.PublicKey(this, 'PublicKey', {
      publicKeyName: props.keyPairName,
      comment: props.keyPairDescription,
      encodedKey: keyPair.getAttString('PublicKey'),
    });

    // Import secrets created by Lambda for grant methods
    this.privateKeySecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'PrivateKeySecret',
      `${props.keyPairName}/private`,
    );
    this.publicKeySecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'PublicKeySecretRef',
      `${props.keyPairName}/public`,
    );

    new secretsmanager.CfnSecret(this, 'PublicKeyIdSecret', {
      name: `${props.keyPairName}/public-key-id`,
      description: `${props.keyPairDescription} (Public Key ID)`,
      secretString: this.publicKey.publicKeyId,
      replicaRegions: props.secretRegions?.map((region) => ({ region })),
    });
  }

  /** Grant read access to the private key secret (for URL signing) */
  grantReadPrivateKey(grantee: iam.IGrantable): iam.Grant {
    return this.privateKeySecret.grantRead(grantee);
  }

  /** Grant read access to the public key secret */
  grantReadPublicKey(grantee: iam.IGrantable): iam.Grant {
    return this.publicKeySecret.grantRead(grantee);
  }

  private validateProps(): void {
    const { keyPairName, keyPairDescription } = this.props;
    if (!keyPairName?.trim()) throw new Error('keyPairName is required');
    if (keyPairName.length > 128)
      throw new Error('keyPairName must be 128 characters or less');
    if (!/^[a-zA-Z0-9/_+=.@-]+$/.test(keyPairName))
      throw new Error('keyPairName contains invalid characters');
    if (!keyPairDescription?.trim())
      throw new Error('keyPairDescription is required');
  }

  private createKeyPairResource(): CustomResource {
    const stack = Stack.of(this);
    const projectRoot = path.join(__dirname, '../src/create-key-pair');

    const fn = new NodejsFunction(this, 'Handler', {
      description: 'CloudFront KeyPair Custom Resource',
      timeout: Duration.seconds(10),
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: this.props.architecture ?? lambda.Architecture.ARM_64,
      entry: path.join(projectRoot, 'index.ts'),
      depsLockFilePath: path.join(projectRoot, 'package-lock.json'),
      projectRoot,
      bundling: { externalModules: ['@aws-sdk/client-secrets-manager'] },
    });

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'secretsmanager:CreateSecret',
          'secretsmanager:DeleteSecret',
          'secretsmanager:ReplicateSecretToRegions',
        ],
        resources: [
          `arn:aws:secretsmanager:${stack.region}:${stack.account}:secret:${this.props.keyPairName}/*`,
        ],
      }),
    );
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:ListSecrets'],
        resources: ['*'],
      }),
    );

    return new CustomResource(this, 'KeyPair', {
      serviceToken: fn.functionArn,
      resourceType: 'Custom::KeyPair',
      properties: {
        Name: this.props.keyPairName,
        Description: this.props.keyPairDescription,
        KeyType: this.props.keyType ?? 'RSA_2048',
        SecretRegions: this.props.secretRegions,
      },
    });
  }
}
