import * as lambda from 'aws-cdk-lib/aws-lambda';

/** Supported key types for CloudFront signed URLs */
export type KeyType = 'RSA_2048' | 'ECDSA_256';

export interface CloudFrontKeyPairProps {
  /** Name for the key pair - used as prefix for secrets */
  readonly keyPairName: string;

  /** Description for the key pair */
  readonly keyPairDescription: string;

  /** Key type: RSA_2048 (default, broader compatibility) or ECDSA_256 (smaller, faster) */
  readonly keyType?: KeyType;

  /** Regions to replicate secrets to */
  readonly secretRegions?: string[];

  /** Lambda architecture (defaults to ARM64) */
  readonly architecture?: lambda.Architecture;
}
