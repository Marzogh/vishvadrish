export function extensionRequest(action, time, signal) {
 return new Promise((resolve,reject)=>{
  const id=crypto.randomUUID();let timer;
  const send=action=>window.postMessage({channel:'vishvadrish-history/request',version:1,id,action,time},location.origin);
  function cleanup(){clearTimeout(timer);window.removeEventListener('message',receive);signal?.removeEventListener('abort',abort);}
  function abort(){cleanup();send('cancel');reject(new DOMException('Cancelled','AbortError'));}
  function receive(event){const m=event.data;if(event.source!==window||event.origin!==location.origin||m?.channel!=='vishvadrish-history/response'||m.version!==1||m.id!==id)return;cleanup();m.result?.ok?resolve(m.result):reject(Error(m.result?.error||'Please enable the extension and reload this page.'));}
  if(signal?.aborted){reject(signal.reason);return;}
  window.addEventListener('message',receive);signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>{cleanup();send('cancel');reject(Error(action==='ping'?'History needs the Viśvadṛś extension.':'Historical request timed out. Please retry.'));},action==='ping'?1500:35000);send(action);
 });
}
