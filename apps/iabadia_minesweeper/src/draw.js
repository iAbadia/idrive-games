// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Recorder } = require('./kit_record.js');
const { LEVELS } = require('./game.js');
const { MODES } = require('./session.js');
const WIDTH = 1280, HEIGHT = 480;
const NUMBER = ['#c8c8ce', '#70bfff', '#83d39b', '#ff8c7c', '#b7a0ff', '#f2b179', '#65d6d6', '#fafafa', '#c8c8ce'];
function time(ms) { if (ms === null) return '--:--'; const sec = Math.floor(ms / 1000); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
function draw(session, now) {
    now = now === undefined ? session.now() : now; session.advance(now);
    const g = session.game, d = g.spec, r = new Recorder(WIDTH, HEIGHT);
    r.clear('#000000');
    r.text('Minesweeper', 54, 86, 43, '#eee4da', { font: 'bold' });
    r.text(d.label, 58, 123, 22, '#a6a6ab');
    r.text('Mines', 58, 181, 20, '#a6a6ab'); r.text(String(d.mines - g.flags.filter(Boolean).length), 56, 226, 36, '#ffffff', { font: 'num' });
    r.text('Time', 235, 181, 20, '#a6a6ab'); r.text(time(g.elapsed), 233, 226, 36, '#ffffff', { font: 'num' });
    MODES.forEach((name,i) => {
        const x = 54 + i * 118;
        r.roundRect(x, 264, 108, 47, 5, i === session.mode ? '#173953' : '#202023');
        if (i === session.mode) r.fillRect(x+8, 307, 92, 3, '#59b9ed');
        r.text(name, x+54, 294, 21, '#ffffff', { align: 'center' });
    });
    r.text('Tilt to move', 58, 356, 21, '#ceced2');
    r.text('Wheel to choose an action', 58, 390, 21, '#a6a6ab');
    r.text(session.notice || (session.mode === 2 ? 'Press for pause menu' : 'Press to ' + MODES[session.mode].toLowerCase()), 58, 424, 20, session.notice ? '#f2b179' : '#a6a6ab');
    const cell = Math.floor(Math.min(432 / d.rows, 810 / d.cols)), w = cell*d.cols, h = cell*d.rows;
    const bx = Math.min(1260 - w, Math.round((1280 - w + 420) / 2)), by = Math.round((480-h)/2), gap = cell < 30 ? 2 : 3;
    r.roundRect(bx-5, by-5, w+10, h+10, 5, '#202023');
    g.revealed.forEach((open,i) => {
        const x = bx + i%d.cols*cell, y = by + Math.floor(i/d.cols)*cell, size = cell-gap, mine = g.mines.indexOf(i)>=0;
        r.roundRect(x,y,size,size,2,open ? (mine ? '#903d33' : '#181b20') : '#343941');
        if (!open) r.line(x+2,y+1,x+size-2,y+1,1,'#525863');
        const cx=x+size/2, cy=y+size/2;
        if ((g.flags[i] || (g.status==='won' && mine)) && !open) {
            const pole=cx-size*.12, top=cy-size*.27, bottom=cy+size*.25;
            const width=size*.38, height=size*.28;
            r.line(pole,top,pole,bottom,2,'#eee4da');
            // Four convex points, the last on the pole, describe a triangular pennant.
            r.quad([[pole,top],[pole+width,top+height/2],[pole,top+height],[pole,top+height/2]],'#f44747');
            r.line(pole,top,pole+width,top+height/2,1,'#ff8c7c');
            r.line(pole-size*.13,bottom,pole+size*.13,bottom,2,'#eee4da');
            if (g.status==='lost' && !mine) { r.line(x+4,y+4,x+size-4,y+size-4,2,'#ff8c7c'); }
        } else if (mine && (open || g.status==='lost')) {
            r.circle(cx,cy,size*.23,'#eee4da');
            r.line(cx,cy-size*.36,cx,cy+size*.36,2,'#eee4da');
            r.line(cx-size*.36,cy,cx+size*.36,cy,2,'#eee4da');
        } else if (open && g.count(i)) r.text(String(g.count(i)),cx,cy+size*.27,Math.min(30,size*.72),NUMBER[g.count(i)],{font:'num',align:'center'});
        if (i===g.cursor) r.strokeRoundRect(x-1,y-1,size+2,size+2,3,2,'#59b9ed');
        if (session.pulse && session.pulse.cell===i) r.strokeRoundRect(x,y,size,size,2,2,[255,255,255,Math.round(220*(1-(now-session.pulse.started)/160))]);
    });
    if (!session.menu) return r;
    r.roundRect(bx-5,by-5,w+10,h+10,5,[0,0,0,90]);
    const mx=30,my=24,mw=390;
    r.roundRect(mx,my,mw,432,7,'#141416');
    r.text({initials:'New best time',pause:'Paused',won:'Minefield cleared',lost:'Mine hit',confirm:'Start a new game?',difficulty:'Difficulty',times:'Best times',help:'How to play'}[session.menu],mx+24,my+51,29,'#ffffff',{font:'bold'});
    if (session.menu==='initials') {
        r.text(time(g.best[g.level]),mx+24,my+100,32,'#edcf72',{font:'num'});
        session.initials.split('').forEach((letter,i)=>{
            const x=mx+28+i*112;
            r.roundRect(x,my+145,100,85,5,i===session.letter?'#173953':'#252528');
            r.text(letter,x+50,my+205,42,'#ffffff',{align:'center',font:'num'});
            if(i===session.letter)r.fillRect(x+12,my+225,76,3,'#59b9ed');
        });
        ['Wheel or up/down: change letter','Left/right: move between letters','Press: next letter; third saves'].forEach((text,i)=>r.text(text,mx+24,my+285+i*30,19,'#bdbdc3'));
        if(session.notice)r.text(session.notice,mx+24,my+409,17,'#f2b179');
        return r;
    }
    if (session.menu==='confirm') r.text('Current progress will be replaced.',mx+24,my+100,19,'#a6a6ab');
    if (session.menu==='help') [ 'Tilt to move the blue cursor.', 'Wheel: Reveal, Flag or Menu.', 'Press to perform that action.', '', 'Numbers count neighboring mines.', 'Flag mines; reveal every safe cell.', 'Press a revealed number to clear', 'its neighbors when flags match.' ].forEach((s,i)=>r.text(s,mx+24,my+93+i*29,19,'#ceced2'));
    if (session.menu==='times') Object.keys(LEVELS).forEach((k,i)=>{
        r.text(LEVELS[k].label+'  '+(g.names[k] || '---'),mx+24,my+120+i*54,23,'#ceced2');
        r.text(time(g.best[k]),mx+mw-24,my+120+i*54,24,'#edcf72',{align:'right',font:'num'});
    });
    const start = ['times','help'].indexOf(session.menu)>=0 ? my+356 : session.menu==='confirm' ? my+226 : my+87;
    session.labels().forEach((label,i)=>{
        const y=start+i*47;
        if(i===session.focus){r.roundRect(mx+12,y,mw-24,41,4,'#173953');r.fillRect(mx+12,y+6,3,29,'#59b9ed');}
        r.text(label,mx+27,y+28,22,i===session.focus?'#ffffff':'#bdbdc3');
    });
    if(session.notice)r.text(session.notice,mx+24,my+418,17,'#f2b179');
    return r;
}
module.exports={draw,time,WIDTH,HEIGHT};
