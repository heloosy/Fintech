import http from 'http';

async function ask(question: string, workspaceId = 'LOCAL-WORKSPACE'): Promise<any> {
  const data = JSON.stringify({ question, workspaceId });
  return new Promise((resolve, reject) => {
    const req = http.request(
      'http://127.0.0.1:3001/api/ai/ask',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve(JSON.parse(body)));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Testing cross-tenant query from LOCAL-WORKSPACE:');
  const resLocal = await ask('What is the liability limit and self-insured retention for policy POL-EXT-999?', 'LOCAL-WORKSPACE');
  console.log('LOCAL-WORKSPACE Response:', JSON.stringify(resLocal, null, 2));

  console.log('\nTesting query from TENANT-EXT-999:');
  const resTenant = await ask('What is the liability limit and self-insured retention for policy POL-EXT-999?', 'TENANT-EXT-999');
  console.log('TENANT-EXT-999 Response:', JSON.stringify(resTenant, null, 2));
}

run().catch(console.error);
