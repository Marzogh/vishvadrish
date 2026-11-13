import{mkdir,readFile,writeFile,copyFile}from'node:fs/promises';import{resolve,join}from'node:path';import{zipSync,strToU8}from'fflate';
const out=process.argv[2];if(!out)throw Error('Specify an output directory outside the application source.');
const root=new URL('../extensions/history/',import.meta.url);await mkdir(out,{recursive:true});
for(const browser of ['chrome','firefox']){
 const manifest={manifest_version:3,name:'Viśvadṛś History',version:'0.2.0',description:'Retrieve historical NICT colour imagery for the Viśvadṛś viewer. Non-commercial use.',host_permissions:['https://himawari8.nict.go.jp/*'],background:browser==='chrome'?{service_worker:'background.js'}:{scripts:['background.js']},content_scripts:[{matches:['https://chipsncode.com/vishvadrish/*','http://127.0.0.1/*'],js:['bridge.js']}]};
 if(browser==='firefox')manifest.browser_specific_settings={gecko:{id:'{b968e45f-79be-461f-a237-7a035831f467}',strict_min_version:'142.0',data_collection_permissions:{required:['none']}}};
 const files={'manifest.json':strToU8(JSON.stringify(manifest,null,2))};for(const name of ['background.js','bridge.js'])files[name]=new Uint8Array(await readFile(new URL(name,root)));files['LICENSE']=new Uint8Array(await readFile(new URL('../LICENSE',import.meta.url)));
 const folder=resolve(out,browser);await mkdir(folder,{recursive:true});for(const[name,bytes]of Object.entries(files))await writeFile(join(folder,name),bytes);
 await writeFile(join(out,`history-${browser}${browser==='firefox'?'-unsigned':''}.zip`),zipSync(files));console.log(`Packaged ${browser}: ${folder}${browser==='firefox'?' (unsigned; submission required)':''}`);
}
