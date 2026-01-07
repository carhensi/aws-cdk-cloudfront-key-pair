// Mock HTTPS
jest.mock('node:https', () => ({
  request: jest.fn()
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManager: jest.fn().mockImplementation(() => ({
    createSecret: jest.fn().mockResolvedValue({ ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret' }),
    deleteSecret: jest.fn().mockResolvedValue({ ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret' }),
    listSecrets: jest.fn().mockResolvedValue({ SecretList: [] })
  }))
}));

const { handler } = require('./index.js');
const https = require('node:https');

describe('Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful HTTPS response
    https.request.mockImplementation((options, callback) => {
      const mockRequest = {
        on: jest.fn((event, handler) => {
          if (event === 'response') {
            const mockResponse = { statusCode: 200, resume: jest.fn() };
            handler(mockResponse);
          }
          return mockRequest;
        }),
        end: jest.fn()
      };
      return mockRequest;
    });
  });

  test('should create key pair successfully', async () => {
    const mockEvent = {
      RequestType: 'Create',
      ResponseURL: 'https://httpbin.org/put',
      StackId: 'test-stack',
      RequestId: 'test-request',
      LogicalResourceId: 'TestKeyPair',
      ResourceProperties: {
        Name: 'test-keypair',
        Description: 'Test Key Pair'
      }
    };

    await expect(handler(mockEvent)).resolves.not.toThrow();
    expect(https.request).toHaveBeenCalled();
  });

  test('should delete key pair successfully', async () => {
    const mockEvent = {
      RequestType: 'Delete',
      ResponseURL: 'https://httpbin.org/put',
      StackId: 'test-stack',
      RequestId: 'test-request',
      LogicalResourceId: 'TestKeyPair',
      ResourceProperties: {
        Name: 'test-keypair',
        Description: 'Test Key Pair'
      }
    };

    await expect(handler(mockEvent)).resolves.not.toThrow();
    expect(https.request).toHaveBeenCalled();
  });
});
