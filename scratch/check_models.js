
const fs = require('fs');
const path = require('path');

// Carrega .env.local manualmente
const envPath = path.join(process.cwd(), '.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/GOOGLE_API_KEY=(.*)/);
  if (match) apiKey = match[1].trim().replace(/"/g, '').replace(/'/g, '');
}

if (!apiKey) {
  console.error('GOOGLE_API_KEY não encontrada no .env.local');
  process.exit(1);
}

async function listModels() {
  try {
    // Tenta v1 e v1beta para garantir
    console.log('--- Modelos v1 ---');
    const resV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    const dataV1 = await resV1.json();
    console.log(JSON.stringify(dataV1, null, 2));

    console.log('\n--- Modelos v1beta ---');
    const resBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const dataBeta = await resBeta.json();
    console.log(JSON.stringify(dataBeta, null, 2));
  } catch (err) {
    console.error('Erro ao listar modelos:', err);
  }
}

listModels();
