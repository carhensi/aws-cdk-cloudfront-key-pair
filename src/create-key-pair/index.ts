import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { generateKeyPairSync } from 'crypto';
import * as https from 'node:https';

interface Props {
  readonly Name: string;
  readonly Description: string;
  readonly KeyType?: 'RSA_2048' | 'ECDSA_256';
  readonly SecretRegions?: string[];
}

const sm = new SecretsManager();

export const handler = async (
  event: CloudFormationCustomResourceEvent,
): Promise<void> => {
  const props = event.ResourceProperties as unknown as Props;
  try {
    const data =
      event.RequestType === 'Delete'
        ? await deleteSecrets(props.Name)
        : await createSecrets(props);
    await respond(event, 'SUCCESS', data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`${event.RequestType} failed: ${msg}`);
    await respond(event, 'FAILED', undefined, msg);
  }
};

function generateKeyPair(keyType: 'RSA_2048' | 'ECDSA_256' = 'RSA_2048') {
  if (keyType === 'ECDSA_256') {
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    return {
      pub: publicKey.export({ type: 'spki', format: 'pem' }) as string,
      priv: privateKey.export({ type: 'sec1', format: 'pem' }) as string,
    };
  }
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  return {
    pub: publicKey.export({ type: 'spki', format: 'pem' }) as string,
    priv: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
  };
}

async function createSecrets(props: Props) {
  const { pub, priv } = generateKeyPair(props.KeyType);
  const regions = props.SecretRegions?.map((Region) => ({ Region }));

  const [pubArn, privArn] = await Promise.all([
    sm.createSecret({
      Name: `${props.Name}/public`,
      SecretString: pub,
      Description: `${props.Description} (Public)`,
      AddReplicaRegions: regions,
    }),
    sm.createSecret({
      Name: `${props.Name}/private`,
      SecretString: priv,
      Description: `${props.Description} (Private)`,
      AddReplicaRegions: regions,
    }),
  ]);

  return {
    PublicKey: pub,
    PublicKeyArn: pubArn.ARN,
    PrivateKeyArn: privArn.ARN,
  };
}

async function deleteSecrets(name: string) {
  const secrets = [`${name}/public`, `${name}/private`];
  await Promise.all(
    secrets.map(async (id) => {
      const { SecretList } = await sm.listSecrets({
        Filters: [{ Key: 'name', Values: [id] }],
      });
      if (SecretList?.length)
        await sm.deleteSecret({
          SecretId: id,
          ForceDeleteWithoutRecovery: true,
        });
    }),
  );
  return {};
}

async function respond(
  event: CloudFormationCustomResourceEvent,
  status: string,
  data?: Record<string, unknown>,
  reason?: string,
): Promise<void> {
  const body = JSON.stringify({
    Status: status,
    Reason: reason,
    PhysicalResourceId: event.ResourceProperties.Name,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data,
  });

  const url = new URL(event.ResponseURL);
  return new Promise((resolve, reject) => {
    https
      .request({
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: 'PUT',
        headers: { 'content-type': '', 'content-length': body.length },
      })
      .on('error', reject)
      .on('response', (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
        } else {
          resolve();
        }
      })
      .end(body);
  });
}
