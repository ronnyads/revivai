const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function testVton() {
  const falKey = process.env.FAL_KEY;
  const res = await fetch('https://fal.run/fal-ai/fashn/tryon', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_image: "https://storage.googleapis.com/falserverless/gallery/duck.jpeg",
      garment_image: "https://storage.googleapis.com/falserverless/gallery/duck.jpeg"
    }),
  });
  
  if(!res.ok) {
    const txt = await res.text();
    console.error('fashn error', txt);
  } else {
    console.log('fashn success', await res.json());
  }

  const res2 = await fetch('https://fal.run/fal-ai/idm-vton', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      human_image_url: "https://storage.googleapis.com/falserverless/gallery/duck.jpeg",
      garment_image_url: "https://storage.googleapis.com/falserverless/gallery/duck.jpeg",
      description: "yellow jacket"
    }),
  });
  
  if(!res2.ok) {
    const txt = await res2.text();
    console.error('idm error', txt);
  } else {
    console.log('idm success', await res2.json());
  }
}

testVton();
