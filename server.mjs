import {createServer} from 'node:http';
import app from './dist/server/index.js';
const port=Number(process.env.PORT||3000);
const host=process.env.HOST||'0.0.0.0';
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be 1–65535');
const server=createServer(async(req,res)=>{
  try{
    req.resume();
    const request=new Request(new URL(req.url,'http://localhost'),{method:req.method});
    const response=await app.fetch(request);
    res.writeHead(response.status,Object.fromEntries(response.headers));
    if(req.method==='HEAD'){res.end();return;}
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch{
    if(!res.headersSent)res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});
    res.end('Temporarily unavailable');
  }
});
server.listen(port,host,()=>console.log('ZKat listening on port '+port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{
  server.close(()=>process.exit(0));
  setTimeout(()=>process.exit(1),10000).unref();
});
