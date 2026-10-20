import {getStore} from '@netlify/blobs';
if(!process.env.NETLIFY_AUTH_TOKEN||!process.env.NETLIFY_SITE_ID)throw Error('Authenticated Netlify environment required');
const action=process.argv[2],target=process.argv[3]||null;if(!['freeze','unfreeze','status'].includes(action))throw Error('Choose freeze, unfreeze or status');if(target&&new URL(target).protocol!=='https:')throw Error('Target must use HTTPS');
const store=getStore({name:'goalforge-football',siteID:process.env.NETLIFY_SITE_ID,token:process.env.NETLIFY_AUTH_TOKEN,consistency:'strong'}),id='__migration_lock',old=await store.getWithMetadata(id,{type:'json',consistency:'strong'});
if(action==='status'){console.log(JSON.stringify({active:old?JSON.parse(old.data.data).active:false}));process.exit(0)}
const row={id,secret:'',revision:(old?.data.revision||0)+1,data:JSON.stringify({active:action==='freeze',changedAt:new Date().toISOString(),target})};const result=await store.setJSON(id,row,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(!result.modified)throw Error('Migration lock changed concurrently');console.log(JSON.stringify({active:action==='freeze',revision:row.revision}));
