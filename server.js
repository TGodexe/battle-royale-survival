import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
const app=express(), http=createServer(app), io=new Server(http,{cors:{origin:false}});
app.use(express.static('public'));
const W=1800,H=1200, players=new Map(), bullets=[], loot=[];
let phase='waiting', start=0, winner='', zone={x:W/2,y:H/2,r:850};
const rand=(a,b)=>Math.random()*(b-a)+a;
const spawn=()=>({x:rand(80,W-80),y:rand(80,H-80)});
function reset(){players.clear();bullets.length=0;loot.length=0;for(let i=0;i<35;i++)loot.push({...spawn(),id:i});phase='waiting';winner='';zone={x:W/2,y:H/2,r:850};}
reset();
io.on('connection',s=>{
 s.on('join',raw=>{
  if(phase!=='waiting'||players.has(s.id))return;
  const name=String(raw||'Survivor').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,18)||'Survivor';
  players.set(s.id,{id:s.id,name,...spawn(),hp:100,ammo:25,kills:0,alive:true,angle:0,input:{},lastShot:0});
  s.emit('joined',s.id);io.emit('notice',`${name} joined (${players.size})`);
 });
 s.on('input',v=>{const p=players.get(s.id);if(!p||!p.alive)return;p.input={up:!!v?.up,down:!!v?.down,left:!!v?.left,right:!!v?.right,shoot:!!v?.shoot};if(Number.isFinite(v?.angle))p.angle=v.angle;});
 s.on('start',()=>{if(phase==='waiting'&&players.size>=2){phase='playing';start=Date.now();io.emit('notice','Battle started!');}});
 s.on('disconnect',()=>{players.delete(s.id);});
});
let previous=Date.now();
setInterval(()=>{
 const now=Date.now(),dt=Math.min((now-previous)/1000,.05);previous=now;
 if(phase==='playing'){
  const elapsed=(now-start)/1000;zone.r=Math.max(95,850-elapsed*5.2);
  for(const p of players.values()){
   if(!p.alive)continue;
   const i=p.input,dx=Number(i.right)-Number(i.left),dy=Number(i.down)-Number(i.up),length=Math.hypot(dx,dy)||1;
   p.x=Math.max(15,Math.min(W-15,p.x+dx/length*225*dt));p.y=Math.max(15,Math.min(H-15,p.y+dy/length*225*dt));
   if(i.shoot&&p.ammo>0&&now-p.lastShot>210){p.lastShot=now;p.ammo--;bullets.push({x:p.x,y:p.y,vx:Math.cos(p.angle)*850,vy:Math.sin(p.angle)*850,owner:p.id,life:.9});}
   if(Math.hypot(p.x-zone.x,p.y-zone.y)>zone.r)p.hp-=12*dt;
   for(let j=loot.length-1;j>=0;j--)if(Math.hypot(p.x-loot[j].x,p.y-loot[j].y)<25){p.ammo+=12;loot.splice(j,1);}
   if(p.hp<=0)p.alive=false;
  }
  for(let j=bullets.length-1;j>=0;j--){const b=bullets[j];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=false;for(const p of players.values())if(p.alive&&p.id!==b.owner&&Math.hypot(p.x-b.x,p.y-b.y)<18){p.hp-=25;if(p.hp<=0){p.alive=false;const killer=players.get(b.owner);if(killer)killer.kills++;}hit=true;break;}if(hit||b.life<=0||b.x<0||b.x>W||b.y<0||b.y>H)bullets.splice(j,1);}
  const alive=[...players.values()].filter(p=>p.alive);if(alive.length<=1){phase='ended';winner=alive[0]?.name||'Nobody';io.emit('notice',`Winner: ${winner}`);}
 }
 io.emit('state',{players:[...players.values()].map(({input,lastShot,...p})=>p),bullets,loot,zone,phase,winner,remaining:[...players.values()].filter(p=>p.alive).length});
},50);
app.get('/health',(_,res)=>res.json({ok:true,phase,players:players.size}));
http.listen(process.env.PORT||3000,()=>console.log('Battle Royale listening on port',process.env.PORT||3000));
