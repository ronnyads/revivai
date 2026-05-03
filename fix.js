const fs = require('fs');
let content = fs.readFileSync('src/lib/studio.ts', 'utf8');

content = content.replace(/(\w+)\.inlineData\?\.mimeType/g, "($1.inlineData?.mimeType || $1.inline_data?.mime_type)");
content = content.replace(/(\w+)\?\.inlineData\?\.data/g, "($1?.inlineData?.data || $1?.inline_data?.data)");
content = content.replace(/(\w+)\.inlineData\.data/g, "($1.inlineData?.data || $1.inline_data?.data)");
content = content.replace(/responseModalities:\s*\[([^\]]+)\]/g, "responseModalities: [$1], response_modalities: [$1]");

fs.writeFileSync('src/lib/studio.ts', content);
console.log('Fixed studio.ts regex');
