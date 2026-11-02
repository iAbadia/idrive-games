// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Desktop preview uses the app's game, input state machine and exact drawing code.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Session } = require('../src/session.js');
const { png } = require('./preview.js');
const storage = require('../src/storage.js');
const save = path.join(require('os').tmpdir(), 'mgu-Snake-preview.json');
let exited = false;
const s = new Session(storage.load(save), { save: (v) => storage.save(save, v), exit: () => { exited = true; } });
s.visibility(true);
const page = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Snake · iDrive preview</title>
<style>body{margin:0;background:#101012;color:#ccc;font:16px system-ui;min-height:100vh;display:grid;place-content:center;gap:20px}img{width:min(100vw,1280px);display:block}p{margin:0 24px;text-align:center}button{font:inherit;padding:8px 20px;background:#202023;color:white;border:1px solid #555;cursor:pointer}#controls{display:flex;justify-content:center;gap:8px}#stage{position:relative}#exitScreen{position:absolute;inset:0;display:grid;place-content:center;gap:18px;text-align:center;background:#000;color:#eee}#exitScreen h1{margin:0;font-size:32px}button:disabled{opacity:.35;cursor:default}[hidden]{display:none!important}</style>
<div id="stage"><img id="screen" src="/frame.png" alt="Snake game board"><div id="exitScreen" hidden><h1>Snake closed</h1><p>Your progress and scores are saved.</p><button id="reopen">Open Snake</button></div></div><p>Wheel or [ / ]: turn left / right · Enter: pause · Arrows: steer · Escape: back</p>
<div id="controls"><button data-a="left">Left</button><button data-a="up">Up</button><button data-a="down">Down</button><button data-a="right">Right</button><button data-a="center">Center</button><button data-a="rotate" data-n="-1">Wheel −</button><button data-a="rotate" data-n="1">Wheel +</button></div><p id="status">Desktop preview</p>
<script>let painting=false,again=false,previous,clientExited=false;function showExit(on){clientExited=on;document.getElementById('exitScreen').hidden=!on;document.querySelectorAll('#controls button').forEach(b=>b.disabled=on);if(on)document.getElementById('reopen').focus();}function reportError(){document.getElementById('status').textContent='Preview connection interrupted. Try again or reload.';}async function paint(){if(painting){again=true;return;}painting=true;again=false;try{const r=await fetch('/frame.png');const active=r.headers.get('X-Animating')==='1';const url=URL.createObjectURL(await r.blob());const screen=document.getElementById('screen');screen.src=url;await screen.decode();if(previous)URL.revokeObjectURL(previous);previous=url;if(active)again=true;}catch(e){again=false;reportError();}finally{painting=false;if(again)setTimeout(paint,33);}}let chain=Promise.resolve();function send(a,n){if(clientExited){if(a==='center')location.reload();return;}chain=chain.then(async()=>{const r=await fetch('/input?a='+a+'&n='+(n||0),{method:'POST'});const v=await r.json();showExit(v.exited);if(!v.exited)paint();document.getElementById('status').textContent=v.exited?'App closed. Select Open Snake or press Enter.':'Desktop preview';}).catch(reportError);}document.addEventListener('keydown',e=>{let a={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Enter:'center',Escape:'back','[':'rotate',']':'rotate'}[e.key];if(a){e.preventDefault();if(!e.repeat)send(a,e.key==='['?-1:1);}});document.addEventListener('wheel',e=>{e.preventDefault();send('rotate',Math.sign(e.deltaY));},{passive:false});document.getElementById('reopen').onclick=()=>location.reload();document.querySelectorAll('#controls button').forEach(b=>b.onclick=()=>send(b.dataset.a,Number(b.dataset.n)));document.addEventListener('visibilitychange',()=>send(document.hidden?'hide':'show'));setInterval(()=>{if(!clientExited&&!document.hidden)paint();},1000);</script></html>`;
const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://localhost');
    res.setHeader('Cache-Control', 'no-store');
    if (u.pathname === '/') { if (exited) s.openMenu(); exited = false; s.visibility(true); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page); }
    else if (u.pathname === '/frame.png') { res.setHeader('Content-Type', 'image/png'); const frame=png(s); res.setHeader('X-Animating',s.animating()?'1':'0'); res.end(frame); }
    else if (u.pathname === '/input' && req.method === 'POST') {
        const action = u.searchParams.get('a');
        if (action === 'hide') s.visibility(false);
        else if (action === 'show' && !exited) s.visibility(true);
        else if (!exited) s.input(action, Math.sign(Number(u.searchParams.get('n'))));
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ exited, menu: s.menu, status: s.game.status }));
    } else { res.statusCode = 404; res.end(); }
});
server.listen(Number(process.env.PORT) || 2051, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:' + server.address().port));
