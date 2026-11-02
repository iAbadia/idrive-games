// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Retain the atlases this game's drawing sizes select; glyph data and atlas keys are unchanged.
const fs=require('fs'),path=require('path');
for(const face of ['regular','semibold']){
 const source=path.join(__dirname,'../../iabadia_2048/src/font_'+face+'.js');
 const fonts=require(source),max=face==='regular'?31:44;
 const result=Object.assign({},fonts,{sizes:fonts.sizes.filter(s=>s.size<=max)});
 const header=fs.readFileSync(source,'utf8').split("'use strict';")[0];
 fs.writeFileSync(path.join(__dirname,'../src/font_'+face+'.js'),header+"'use strict';\nmodule.exports = "+JSON.stringify(result)+";\n");
}
