window.addEventListener('message',event=>{
 const m=event.data;if(event.source!==window||event.origin!==location.origin||m?.channel!=='vishvadrish-history/request'||m.version!==1||!['ping','frame','cancel'].includes(m.action))return;
 chrome.runtime.sendMessage({version:1,action:m.action,id:m.id,time:m.time},result=>{
  const error=chrome.runtime.lastError;
  window.postMessage({channel:'vishvadrish-history/response',version:1,id:m.id,result:error?{ok:false,error:'Extension connection failed: '+error.message}:result},location.origin);
 });
});
