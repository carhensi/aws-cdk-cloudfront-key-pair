jest.mock('node:https', () => ({
  request: jest.fn(() => {
    const req = {
      on: jest.fn((event, cb) => {
        if (event === 'response') {
          setTimeout(() => cb({ statusCode: 200, resume: jest.fn() }), 0);
        }
        return req;
      }),
      end: jest.fn(),
    };
    return req;
  }),
}));

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManager: jest.fn(() => ({
    createSecret: jest.fn().mockResolvedValue({ ARN: 'arn:aws:secretsmanager:us-east-1:123:secret:test' }),
    deleteSecret: jest.fn().mockResolvedValue({}),
    listSecrets: jest.fn().mockResolvedValue({ SecretList: [] }),
  })),
}));

const { handler } = require('./index.js');

const mockEvent = (type) => ({
  RequestType: type,
  ResponseURL: 'https://example.com/response',
  StackId: 'stack-1',
  RequestId: 'req-1',
  LogicalResourceId: 'KP',
  ResourceProperties: { Name: 'test', Description: 'Test', KeyType: 'RSA_2048' },
});

describe('handler', () => {
  test('Create succeeds', async () => {
    await expect(handler(mockEvent('Create'))).resolves.toBeUndefined();
  }, 10000);

  test('Delete succeeds', async () => {
    await expect(handler(mockEvent('Delete'))).resolves.toBeUndefined();
  }, 10000);
});
