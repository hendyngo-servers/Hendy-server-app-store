interface Env { LAYOUT_CACHE: KVNamespace; USER_STORE_URL?: string; ADMIN_STUDIO_URL?: string; }
function device(ua:string){if(/iPhone|iPad|iPod/i.test(ua))return"ios";if(/Android/i.test(ua))return"android";if(/Windows/i.test(ua))return"windows";if(/Macintosh|Mac OS/i.test(ua))return"macos";return"other";}
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export default { async fetch(request:Request,env:Env):Promise<Response>{const url=new URL(request.url);if(url.pathname==="/health")return json({ok:true,service:"edge-router",time:new Date().toISOString()});
 const host=url.hostname.toLowerCase();let routes:Record<string,string>={};try{routes=JSON.parse((await env.LAYOUT_CACHE.get("routes:v1"))??"{}");}catch{return json({error:"Invalid routes:v1 KV JSON"},500);}
 const fallback=url.pathname.startsWith("/admin")?env.ADMIN_STUDIO_URL:env.USER_STORE_URL;const target=routes[host]??fallback;
 if(!target)return json({service:"hendy-edge-router",message:"No route configured. Set routes:v1 KV JSON or USER_STORE_URL/ADMIN_STUDIO_URL vars.",host,device:device(request.headers.get("user-agent")??"")},503);
 let dest:URL;try{dest=new URL(target);}catch{return json({error:"Invalid edge route target"},500);}if(dest.hostname===host)return json({service:"hendy-edge-router",host,device:device(request.headers.get("user-agent")??""),message:"This hostname already points to its destination."});
 dest.pathname=url.pathname+dest.pathname.replace(/\/$/,"");dest.search=url.search;return Response.redirect(dest.toString(),302);
 }};
