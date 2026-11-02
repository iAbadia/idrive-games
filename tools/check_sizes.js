// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const root=path.join(__dirname,'..'),budget=512*1024,unpackedBudget=1024*1024;
let failed=false;
for(const id of fs.readdirSync(path.join(root,'apps'))){
 const dir=path.join(root,'apps',id),manifestPath=path.join(dir,'mgu-app.json');if(!fs.existsSync(manifestPath))continue;
 const m=JSON.parse(fs.readFileSync(manifestPath,'utf8')),file=path.join(dir,id+'@'+m.version+'.src.tgz');
 if(!fs.existsSync(file))throw Error('Run npm run build first: '+id);
 const bytes=fs.statSync(file).size,tar=zlib.gunzipSync(fs.readFileSync(file));let unpacked=0;
 for(let off=0;off+512<=tar.length;){
  if(!tar[off])break;
  const name=tar.toString('utf8',off,off+100).replace(/\0.*$/s,''),n=parseInt(tar.toString('ascii',off+124,off+136).replace(/\0.*$/s,'').trim(),8)||0;
  if(/(^|\/)(preview|tools|test|tests|node_modules|data|\.git)(\/|$)/.test(name))throw Error('Unexpected packaged content: '+name);
  unpacked+=n;off+=512+Math.ceil(n/512)*512;
 }
 console.log(id+' '+m.version+': '+(bytes/1024).toFixed(1)+' KiB package, '+(unpacked/1024).toFixed(1)+' KiB unpacked source');
 if(bytes>budget||unpacked>unpackedBudget){failed=true;console.error('Budget exceeded: 512 KiB package / 1 MiB source');}
}
if(failed)process.exitCode=1;
