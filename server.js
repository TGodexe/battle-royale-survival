import express from 'express';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
const app=express(),http=createServer(app),io=new Server(http);
app.use(express.static('public'));
const players=new Map(),scores={red:0,blue:0},LIMIT=20,ROUND=300000;
const obstacles=[[-13,-7,3,3],[-13,5,3,3],[-3,-10,4,3],[-3,7,4,3],[7,-7,3,4],[7,5,3,4],[-2,-2,4,4],[-18,-2,3,4],[15,-2,3,4]];
let roundStart=Date.now(),round=1;
const spawn=team=>({x:team==='red'?-19:19,z:(Math.random()-.5)*10});
const aliveCount=team=>[...players.values()].filter(p=>p.team===team).length;
const validPosition=(x,z)=>Math.abs(x)<23&&Math.abs(z)<15&&!obstacles.some(([ox,oz,w,h])=>x>ox-.45&&x<ox+w+.45&&z>oz-.45&&z<oz+h+.45);
const snapshot=()=>({players:[...players.values()].map(({input,lastShot,spawnAt,...p})=>p),scores,round,timeLeft:Math.max(0,Math.ceil((ROUND-(Date.now()-roundStart))/1000)),limit:LIMIT});
function resetRound(){scores.red=0;scores.blue=0;round++;roundStart=Date.now();for(const p of players.values())Object.assign(p,{...spawn(p.team),hp:100,ammo:30,reloading:false,deaths:0,kills:0,spawnAt:0});io.emit('notice','New round!');}
io.on('connection',s=>{
 s.on('join',raw=>{if(players.has(s.id))return;const team=aliveCount('red')<=aliveCount('blue')?'red':'blue';const name=String(raw||'Soldier').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,18)||'Soldier';players.set(s.id,{id:s.id,name,team,...spawn(team),yaw:team==='red'?-Math.PI/2:Math.PI/2,hp:100,ammo:30,kills:0,deaths:0,reloading:false,lastShot:0,spawnAt:0,input:{}});s.emit('welcome',{id:s.id,team,obstacles});io.emit('notice',name+' joined '+team.toUpperCase());});
 s.on('input',data=>{const p=players.get(s.id);if(!p)return;p.input={forward:Math.max(-1,Math.min(1,Number(data?.forward)||0)),strafe:Math.max(-1,Math.min(1,Number(data?.strafe)||0))};if(Number.isFinite(data?.yaw))p.yaw=data.yaw;});
 s.on('reload',()=>{const p=players.get(s.id);if(!p||p.hp<=0||p.reloading||p.ammo===30)return;p.reloading=true;setTimeout(()=>{if(players.get(s.id)===p){p.ammo=30;p.reloading=false;}},1600);});
 s.on('shoot',data=>{const p=players.get(s.id),now=Date.now();if(!p||p.hp<=0||p.reloading||p.ammo<=0||now-p.lastShot<175)return;p.lastShot=now;p.ammo--;
 const angle=Number.isFinite(data?.yaw)?data.yaw:p.yaw,dir={x:-Math.sin(angle),z:-Math.cos(angle)};let best=null,distance=35;
 for(const t of players.values()){if(t.team===p.team||t.hp<=0)continue;const dx=t.x-p.x,dz=t.z-p.z,along=dx*dir.x+dz*dir.z,off=Math.abs(dx*dir.z-dz*dir.x);if(along>0&&along<distance&&off<.65){let blocked=false;for(let step=.4;step<along;step+=.4)if(obstacles.some(([ox,oz,w,h])=>p.x+dir.x*step>ox&&p.x+dir.x*step<ox+w&&p.z+dir.z*step>oz&&p.z+dir.z*step<oz+h)){blocked=true;break;}if(!blocked){best=t;distance=along;}}}
 if(best){best.hp=Math.max(0,best.hp-25);if(!best.hp){p.kills++;best.deaths++;scores[p.team]++;best.spawnAt=now+3000;io.emit('notice',p.name+' eliminated '+best.name);}}
 io.emit('shot',{id:p.id,x:p.x,z:p.z,dx:dir.x,dz:dir.z,hit:!!best});
 if(scores.red>=LIMIT||scores.blue>=LIMIT){io.emit('notice',(scores.red>scores.blue?'RED':'BLUE')+' TEAM WINS!');resetRound();}
 });
 s.on('disconnect',()=>players.delete(s.id));
});
let prev=Date.now();setInterval(()=>{const now=Date.now(),dt=Math.min(.05,(now-prev)/1000);prev=now;
 for(const p of players.values()){if(p.hp<=0){if(now>=p.spawnAt)Object.assign(p,{...spawn(p.team),hp:100,ammo:30,reloading:false});continue;}
 const f=p.input.forward||0,r=p.input.strafe||0,dx=(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*r)*6*dt,dz=(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*r)*6*dt;
 if(validPosition(p.x+dx,p.z))p.x+=dx;if(validPosition(p.x,p.z+dz))p.z+=dz;
 }if(now-roundStart>=ROUND)resetRound();io.emit('state',snapshot());
},50);
app.get('/health',(_,res)=>res.json({ok:true,mode:'team-fps',players:players.size}));
http.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Team FPS online'));
