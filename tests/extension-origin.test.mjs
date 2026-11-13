import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
test('extension accepts the ChipsnCode viewer and rejects other sites and paths',async()=>{
 const code=await readFile(new URL('../extensions/history/background.js',import.meta.url),'utf8');
 const allowed=runInNewContext(code+';allowed',{URL,chrome:{runtime:{onMessage:{addListener(){}}}}});
 assert.equal(allowed('https://chipsncode.com/vishvadrish/'),true);
 assert.equal(allowed('https://chipsncode.com/vishvadrish/index.html'),true);
 assert.equal(allowed('http://127.0.0.1:4174/'),true);
 for(const url of ['https://marzogh.github.io/vishvadrish/','https://chipsncode.com/','https://chipsncode.com/vishvadrish-other/','https://chipsncode.com.evil.example/vishvadrish/','http://chipsncode.com/vishvadrish/']) assert.equal(allowed(url),false,url);
});
