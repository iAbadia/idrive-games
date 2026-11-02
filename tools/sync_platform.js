// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
for(const id of fs.readdirSync(path.join(root,'apps')))if(fs.existsSync(path.join(root,'apps',id,'mgu-app.json')))fs.copyFileSync(path.join(root,'shared/platform.js'),path.join(root,'apps',id,'src/platform.js'));
