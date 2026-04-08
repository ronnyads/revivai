const r=require('replicate');  
const client=new r({auth:process.env.REPLICATE_API_TOKEN});  
client.models.versions.list('microsoft', 'bringing-old-photos-back-to-life').then(v => console.log(JSON.stringify(v.results[0].openapi_schema.components.schemas.Input))).catch(console.error);  
