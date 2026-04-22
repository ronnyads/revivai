update public.prompt_templates
set
  title = 'Selfie Heroica com Personagens',
  description = 'Envie qualquer rosto e transforme a pessoa em uma selfie cinematografica com personagens heroicos ao fundo.',
  category = 'Fantasia Cinematica',
  format = 'TEXT',
  prompt = 'Create a cinematic smartphone selfie in a modern city street with four iconic heroic characters standing behind the main subject: a spider-themed hero in a red and blue suit, a red and gold armored hero, a large green super-strong hero, and an ice queen in a blue dress. Replace the original child completely with the person from person[1] as the exclusive identity reference. Preserve the exact face, bone structure, age appearance, skin tone, hair, expression, body proportions and overall identity from the uploaded photo. The uploaded person must be the only real human subject in the foreground taking the selfie with one arm extended toward the camera. Do not keep any trace of the original child from the example scene. Commercial cinematic lighting, natural daylight, shallow depth of field, soft bokeh, highly realistic integration, fun heroic family-friendly atmosphere, Hasselblad H6D, Zeiss Otus 85mm f/1.4, Kodak Portra 400, film grain, 8K.',
  generation_mode = 'identity_scene',
  input_mode = 'single_image',
  required_images_count = 1,
  credit_cost = 12,
  usage_label = 'Envie 1 foto da pessoa. O sistema troca o sujeito da selfie pela referencia enviada.',
  identity_lock = true,
  updated_at = now()
where id = 'alpha-fitness-elite';
