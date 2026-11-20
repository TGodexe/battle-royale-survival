const socket=io(),canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),hotbar=document.querySelector('#hotbar');
let id=null,world=[],players=[],inventory={},tile=32,zoom=1,selected=0;
const blocks=['dirt','stone','wood','grass','sand','leaves'],colors={grass:'#62a348',dirt:'#8c603d',stone:'#838d8f',wood:'#a5794c',leaves:'#3b8b4a',sand:'#dec47c',water:'#4e9fc9',empty:'#2d4230'};
const keys=new Set();let pointer={x:0,y:0};
function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;}addEventListener('resize',resize);resize();
document.querySelector('#join').onclick=()=>socket.emit('join',document.querySelector('#name').value);
socket.on('welcome',v=>{id=v.id;world=v.world;tile=v.tile;document.querySelector('#menu').style.display='none';renderBar();});
socket.on('players',p=>{players=p;document.querySelector('#online').textContent=p.length+' player(s) online';});
socket.on('tile',t=>{if(world[t.y])world[t.y][t.x]=t.block;});
socket.on('inventory',i=>{inventory=i;renderBar();});
socket.on('connect_error',()=>document.querySelector('#online').textContent='Connection error');
function renderBar(){hotbar.innerHTML='';blocks.forEach((b,i)=>{const el=document.createElement('button');el.className='slot'+(selected===i?' selected':'');el.innerHTML='<span class="swatch" style="background:'+colors[b]+'"></span><span>'+(i+1)+'. '+b+'</span><span>'+(inventory[b]||0)+'</span>';el.onclick=()=>{selected=i;renderBar();};hotbar.append(el);});}
addEventListener('keydown',e=>{if(document.activeElement.tagName==='INPUT')return;keys.add(e.key.toLowerCase());if(/^[1-6]$/.test(e.key)){selected=Number(e.key)-1;renderBar();}if(e.key.startsWith('Arrow')||e.key===' ')e.preventDefault();});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
setInterval(()=>{if(id)socket.emit('input',{up:keys.has('w')||keys.has('arrowup'),down:keys.has('s')||keys.has('arrowdown'),left:keys.has('a')||keys.has('arrowleft'),right:keys.has('d')||keys.has('arrowright')});},50);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.65,Math.min(2,zoom+(e.deltaY<0?.1:-.1)));},{passive:false});
canvas.addEventListener('mousedown',e=>{if(!id)return;const p=players.find(p=>p.id===id);if(!p)return;const x=Math.floor((e.clientX-innerWidth/2)/zoom/tile+p.x/tile),y=Math.floor((e.clientY-innerHeight/2)/zoom/tile+p.y/tile);socket.emit('edit',{x,y,action:e.button===2?'place':'mine',block:blocks[selected]});});
function draw(){requestAnimationFrame(draw);const d=devicePixelRatio;ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle='#13251c';ctx.fillRect(0,0,innerWidth,innerHeight);const me=players.find(p=>p.id===id),cx=me?.x||1280,cy=me?.y||832;ctx.save();ctx.translate(innerWidth/2,innerHeight/2);ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);
const left=Math.max(0,Math.floor((cx-innerWidth/2/zoom)/tile)-1),right=Math.min(80,Math.ceil((cx+innerWidth/2/zoom)/tile)+1),top=Math.max(0,Math.floor((cy-innerHeight/2/zoom)/tile)-1),bottom=Math.min(52,Math.ceil((cy+innerHeight/2/zoom)/tile)+1);
for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const b=world[y]?.[x]||'empty';ctx.fillStyle=colors[b]||colors.empty;ctx.fillRect(x*tile,y*tile,tile,tile);ctx.strokeStyle='#00000018';ctx.strokeRect(x*tile,y*tile,tile,tile);if(b==='grass'){ctx.fillStyle='#9cd16c';ctx.fillRect(x*tile+5,y*tile+5,5,5);}if(b==='wood'){ctx.fillStyle='#654a2b';ctx.fillRect(x*tile+10,y*tile+10,12,12);}}
for(const p of players){ctx.fillStyle='#0007';ctx.fillRect(p.x-11,p.y+10,23,7);ctx.fillStyle=p.color;ctx.fillRect(p.x-10,p.y-13,20,27);ctx.fillStyle='#2e3529';ctx.fillRect(p.x-6,p.y-7,4,4);ctx.fillRect(p.x+3,p.y-7,4,4);ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillStyle='white';ctx.fillText(p.name,p.x,p.y-22);}
ctx.restore();document.querySelector('#coords').textContent=me?'X: '+Math.floor(me.x/tile)+'  Z: '+Math.floor(me.y/tile):'';}draw();
