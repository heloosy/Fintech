import http from 'http';

async function ask(question: string): Promise<any> {
  const data = JSON.stringify({
    question: question,
    workspaceId: 'LOCAL-WORKSPACE',
  });

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
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const questions = [
    'What is the statutory penalty for false insurance statements under Section 1871.2?',
    'What is the total mitigation invoice amount from RapidDry and what is the net payable after deductible?',
    'What is the dwelling limit and water damage coverage under Beacon and Oak policy?',
    'What is the error code and idempotency key for the carrier gateway failure?'
  ];

  for (const q of questions) {
    console.log(`\n========================================\nQ: ${q}`);
    const res = await ask(q);
    const ans = res.data?.answer || res.error || JSON.stringify(res);
    console.log(`A: ${ans}`);
    console.log(
      `Citations:`,
      res.data?.citations?.map((c: any) => `${c.filename} (p.${c.page})`)
    );
  }
}

run().catch(console.error);
