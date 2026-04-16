const fs = require('fs');
const lines = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/);
let falKey = '';
for (const line of lines) {
  if (line.startsWith('FAL_KEY=')) {
    falKey = line.replace('FAL_KEY=', '').trim();
  }
}

fetch('https://fal.run/fal-ai/fashn/tryon', {
  method: 'POST',
  headers: {
    'Authorization': 'Key ' + falKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model_image: 'https://storage.googleapis.com/falserverless/gallery/duck.jpeg',
    garment_image: 'https://storage.googleapis.com/falserverless/gallery/duck.jpeg',
    category: 'tops'
  })
}).then(r => r.json()).then(t => console.log('Result:', JSON.stringify(t, null, 2))).catch(console.error);
