import fs from 'fs'; 
import fetch from 'node-fetch'; 
async function dl() { 
  const res = await fetch('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&q=80'); 
  const buf = await res.arrayBuffer(); 
  const b64 = Buffer.from(buf).toString('base64'); 
  fs.writeFileSync('face.txt', b64); 
} 
dl();
