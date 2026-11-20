import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
const app=express(),http=createServer(app),io=new Server(http);
app.use(express.static('public'));
const WIDTH=80,HEIGHT=52,TILE=32,players=new Map();
const types=['grass','dirt','stone','wood','leaves','sand','water'];
const world=Array.from({length:HEIGHT},(_,y)=>Array.from({length:WIDTH},(_,x)=>{
 const n=Math.sin(x*.31)*Math.cos(y*.23)+Math.sin(x*.09+y*.13);
 return n<-.72?'water':n<-.46?'sand':n>.95?'stone':'grass';
}));
for(let i=0;i<120;i++){const x=2+Math.floor(Math.random()*(WIDTH-4)),y=2+Math.floor(Math.random()*(HEIGHT-4));if(world[y][x]==='grass'){world[y][x]='wood';for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])if(world[y+dy]?.[x+dx]==='grass')world[y+dy][x+dx]='leaves';}}
const safeName=s=>String(s||'Builder').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,18)||'Builder';
const publicPlayers=()=>[...players.values()].map(({input,...p})=>p);
io.on('connection',socket=>{
 socket.on('join',name=>{
  if(players.has(socket.id))return;
  const p={id:socket.id,name:safeName(name),x:WIDTH*TILE/2,y:HEIGHT*TILE/2,color:['#f6bd60','#7bdff2','#b2f7a6','#f7a8b8'][players.size%4],inventory:{dirt:15,stone:8,wood:10,grass:10,sand:10,leaves:5},input:{}};
  players.set(socket.id,p);socket.emit('welcome',{id:socket.id,world,types,width:WIDTH,height:HEIGHT,tile:TILE});io.emit('players',publicPlayers());
 });
 socket.on('input',data=>{const p=players.get(socket.id);if(p)p.input={up:!!data?.up,down:!!data?.down,left:!!data?.left,right:!!data?.right};});
 socket.on('edit',data=>{
  const p=players.get(socket.id);if(!p)return;
  const x=Number(data?.x),y=Number(data?.y),action=data?.action,block=data?.block;
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=WIDTH||y>=HEIGHT)return;
  if(Math.hypot((x+.5)*TILE-p.x,(y+.5)*TILE-p.y)>TILE*5)return;
  const old=world[y][x];
  if(action==='mine'){if(old==='water'||old==='empty')return;world[y][x]='empty';p.inventory[old]=(p.inventory[old]||0)+1;}
  else if(action==='place'){if(old!=='empty'||!types.includes(block)||block==='water'||(p.inventory[block]||0)<1)return;world[y][x]=block;p.inventory[block]--;}
  else return;
  io.emit('tile',{x,y,block:world[y][x]});socket.emit('inventory',p.inventory);
 });
 socket.on('disconnect',()=>{players.delete(socket.id);io.emit('players',publicPlayers());});
});
let last=Date.now();
setInterval(()=>{const now=Date.now(),dt=Math.min((now-last)/1000,.05);last=now;let changed=false;
 for(const p of players.values()){const v=p.input,dx=Number(!!v.right)-Number(!!v.left),dy=Number(!!v.down)-Number(!!v.up),len=Math.hypot(dx,dy)||1;
  const nx=Math.max(16,Math.min(WIDTH*TILE-16,p.x+dx/len*185*dt)),ny=Math.max(16,Math.min(HEIGHT*TILE-16,p.y+dy/len*185*dt));
  const t=world[Math.floor(ny/TILE)]?.[Math.floor(nx/TILE)];if(t!=='water'&&t!=='stone'&&t!=='wood'){p.x=nx;p.y=ny;}changed=true;
 }
 if(changed&&players.size)io.emit('players',publicPlayers());
},50);
app.get('/health',(_,res)=>res.json({ok:true,players:players.size,mode:'block-sandbox'}));
http.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Block World online'));
