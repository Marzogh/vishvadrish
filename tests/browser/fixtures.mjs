const host = 'https://www.data.jma.go.jp/mscweb/data/himawari/';
export async function fixtures(page, { catalogueStatus = 200, imageStatus = 200, corrupt = false, delay = false, extended = false, blankColour = false, badRegionalDimensions = false } = {}) {
  const data = await page.evaluate(() => {
    function make(width,height,black=false) {
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
      ctx.fillStyle=black?'black':'#101010';ctx.fillRect(0,0,width,height);
      if(!black){ctx.fillStyle='#cccccc';ctx.beginPath();ctx.arc(width/2,height/2,Math.min(width,height)*.4,0,Math.PI*2);ctx.fill();}
      return Array.from({length:3},(_,i)=>{if(!black)for(let b=0;b<4;b++){ctx.fillStyle=i&(1<<b)?'white':'black';ctx.fillRect(30+b*100,250,50,50);}return canvas.toDataURL('image/jpeg').split(',')[1];});
    }
    return {full:make(550,550),aus:make(901,701),black:make(901,701,true)};
  });
  const standard=[['0020','00:30 UTC 1 January 2026'],['0000','00:10 UTC 1 January 2026'],['2350','00:00 UTC 1 January 2026']];
  const entries=extended?Array.from({length:24},(_,i)=>{const d=new Date(Date.UTC(2026,0,1,0,i*10));return [String(i).padStart(4,'0'),`${d.toISOString().slice(11,16)} UTC 1 January 2026`];}):standard;
  const html='<select name="slt_time">'+entries.map(([slot,label])=>`<option value="${slot}">${label}</option>`).join('')+'</select>';
  await page.route(host+'**',async route=>{
    const url=route.request().url(),catalogue=url.includes('sat_img.php');
    if(delay&&!catalogue)await new Promise(resolve=>setTimeout(resolve,1200));
    const collection=blankColour&&url.includes('_trm_0020')?data.black:url.includes('/img/aus/')&&!badRegionalDimensions?data.aus:data.full;
    const index=url.includes('_2350.')?0:url.includes('_0000.')?1:2;
    await route.fulfill({status:catalogue?catalogueStatus:imageStatus,headers:{'access-control-allow-origin':'*'},contentType:catalogue?'text/html':'image/jpeg',body:catalogue?html:corrupt?Buffer.from('broken jpeg'):Buffer.from(collection[index],'base64')});
  });
}
