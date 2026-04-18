
const googleApiKey = process.env.GOOGLE_API_KEY;

async function listModels() {
  if (!googleApiKey) {
    console.error('GOOGLE_API_KEY NOT FOUND');
    return;
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${googleApiKey}`);
    const data = await res.json();
    console.log('--- MODELS ---');
    if (data.models) {
      data.models.forEach(m => {
        if (m.name.includes('imagen')) {
          console.log(m.name);
        }
      });
    } else {
      console.log('No models found or error:', data);
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

listModels();
