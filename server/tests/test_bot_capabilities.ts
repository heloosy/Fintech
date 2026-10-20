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
  const tests = [
    {
      title: 'General Insurance Guidance & How to get one (Insurance not in documents)',
      query: 'I do not have flood insurance. How do I get flood insurance and what documents do I need?',
      ws: 'LOCAL-WORKSPACE'
    },
    {
      title: 'Empty Workspace / New User without documents',
      query: 'How do I purchase auto insurance and what information will the insurance company ask for?',
      ws: 'NEW-EMPTY-WORKSPACE'
    },
    {
      title: 'Grounded Query on Existing Uploaded Document',
      query: 'What is the collision deductible and repair estimate total under my Aegis and Apex documents?',
      ws: 'LOCAL-WORKSPACE'
    }
  ];

  for (const t of tests) {
    console.log(`\n========================================`);
    console.log(`TEST: ${t.title}`);
    console.log(`QUERY: "${t.query}" (WS: ${t.ws})`);
    const res = await ask(t.query, t.ws);
    console.log(`RESPONSE:\n${res.answer}`);
    console.log(`EvidenceFound: ${res.evidenceFound}`);
    console.log(`Citations: ${res.citations?.length || 0}`);
  }
}

run().catch(console.error);
