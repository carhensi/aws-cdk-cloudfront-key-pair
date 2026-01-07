import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface KeyPairProps {
  /** @readonly Key Pair name */
  readonly name: string;

  /** @readonly Key Pair description */
  readonly description: string;

  /** @readonly Regions to replicate AWS secrets to */
  readonly secretRegions?: string[];

  /** @readonly Lambda architecture (defaults to ARM64) */
  readonly architecture?: lambda.Architecture;
}
