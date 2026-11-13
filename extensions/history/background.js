const jobs = new Map();
function allowed(url) { try {const u=new URL(url);return (u.origin==='https://chipsncode.com'&&u.pathname.startsWith('/vishvadrish/')) || (u.hostname==='127.0.0.1'&&u.protocol==='http:');}catch{return false;} }
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(!allowed(sender.url)||m?.version!==1||typeof m.id!=='string'||m.id.length>80)return;
 const key=(sender.tab?.id ?? sender.url)+':'+m.id;
 if(m.action==='ping'){reply({ok:true,version:1});return;}
 if(m.action==='cancel'){jobs.get(key)?.abort();reply({ok:true});return;}
 if(m.action!=='frame')return;
 (async()=>{let timer;try{
  const time=m.time;if(typeof time!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00.000Z$/.test(time)||!Number.isFinite(Date.parse(time))||new Date(time).toISOString()!==time||Date.parse(time)%600000)throw Error('Choose a valid ten-minute UTC time.');
  if(jobs.size>=2)throw Error('History is busy. Please retry.');
  const controller=new AbortController();jobs.set(key,controller);timer=setTimeout(()=>controller.abort(),30000);
  const url='https://himawari8.nict.go.jp/img/D531106/1d/550/'+time.slice(0,10).replaceAll('-','/')+'/'+time.slice(11,19).replaceAll(':','')+'_0_0.png';
  const response=await fetch(url,{signal:controller.signal,credentials:'omit',redirect:'error'});
  if(response.status===404){reply({ok:true,missing:true});return;}
  if(!response.ok)throw Error('NICT returned HTTP '+response.status+'. Please retry.');
  const chunks=[];let size=0;const reader=response.body.getReader();try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>5000000)throw Error('Image exceeds 5 MB.');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  if(bytes.length<24||![137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)||new DataView(bytes.buffer).getUint32(16)!==550||new DataView(bytes.buffer).getUint32(20)!==550)throw Error('Unexpected NICT image.');
  let text='';for(let i=0;i<size;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));reply({ok:true,data:btoa(text)});
 }catch(e){reply({ok:false,error:e.name==='AbortError'?'Historical request stopped.':e.message});}finally{clearTimeout(timer);jobs.delete(key);}})();return true;
});
