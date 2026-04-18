
const fs = require('fs');
const path = require('path');

async function checkModels() {
  const envPath = path.join(process.cwd(), '.env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  const keyMatch = env.match(/GOOGLE_API_KEY=(.*)/);
  if (!keyMatch) {
    console.error('Chave não encontrada');
    return;
  }
  const key = keyMatch[1].trim().replace(/['"]/g, '');

  console.log('--- Buscando modelos de imagem ---');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    if (!data.models) {
      console.log('Resposta inesperada:', data);
      return;
    }
    const filtered = data.models.filter(m => 
      m.name.toLowerCase().includes('imagen') || 
      m.displayName?.toLowerCase().includes('imagen')
    );
    console.log(JSON.stringify(filtered, null, 2));
  } catch (err) {
    console.error('Erro na requisição:', err);
  }
}

checkModels();
