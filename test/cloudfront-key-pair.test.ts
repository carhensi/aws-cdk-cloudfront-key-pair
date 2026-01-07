import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CloudFrontKeyPair } from '../lib';

describe('CloudFrontKeyPair', () => {
  let stack: cdk.Stack;

  beforeEach(() => {
    stack = new cdk.Stack(new cdk.App(), 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
  });

  test('creates Lambda with ARM64 and Node 24', () => {
    new CloudFrontKeyPair(stack, 'KP', {
      keyPairName: 'test',
      keyPairDescription: 'Test',
    });
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs24.x',
      Architectures: ['arm64'],
    });
  });

  test('creates CloudFront PublicKey', () => {
    new CloudFrontKeyPair(stack, 'KP', {
      keyPairName: 'test',
      keyPairDescription: 'Test',
    });
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::PublicKey',
      {
        PublicKeyConfig: { Name: 'test', Comment: 'Test' },
      },
    );
  });

  test('scopes IAM policy to secret prefix', () => {
    new CloudFrontKeyPair(stack, 'KP', {
      keyPairName: 'test',
      keyPairDescription: 'Test',
    });
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: [
              'secretsmanager:CreateSecret',
              'secretsmanager:DeleteSecret',
              'secretsmanager:ReplicateSecretToRegions',
            ],
            Resource:
              'arn:aws:secretsmanager:us-east-1:123456789012:secret:test/*',
          }),
        ]),
      },
    });
  });

  test('creates PublicKeyId secret with replication', () => {
    new CloudFrontKeyPair(stack, 'KP', {
      keyPairName: 'test',
      keyPairDescription: 'Test',
      secretRegions: ['eu-west-1'],
    });
    Template.fromStack(stack).hasResourceProperties(
      'AWS::SecretsManager::Secret',
      {
        Name: 'test/public-key-id',
        ReplicaRegions: [{ Region: 'eu-west-1' }],
      },
    );
  });

  test('throws on invalid props', () => {
    expect(
      () =>
        new CloudFrontKeyPair(stack, 'KP', {
          keyPairName: '',
          keyPairDescription: 'Test',
        }),
    ).toThrow('keyPairName is required');
    expect(
      () =>
        new CloudFrontKeyPair(stack, 'KP2', {
          keyPairName: 'test!',
          keyPairDescription: 'Test',
        }),
    ).toThrow('invalid characters');
    expect(
      () =>
        new CloudFrontKeyPair(stack, 'KP3', {
          keyPairName: 'test',
          keyPairDescription: '',
        }),
    ).toThrow('keyPairDescription is required');
  });
});
