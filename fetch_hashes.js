const Replicate = require('replicate');
const r = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const models = [
  'nightmareai/real-esrgan',
  'sczhou/codeformer',
  'arielreplicate/deoldify_image',
  'stability-ai/stable-diffusion-inpainting'
];

async function run() {
  for (const name of models) {
    try {
      const parts = name.split('/');
      const m = await r.models.get(parts[0], parts[1]);
      console.log('SUCCESS_HASH:', name, m.latest_version.id);
    } catch (e) {
      console.error('Error fetching', name, e.message);
    }
  }
}

run();
