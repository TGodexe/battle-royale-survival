import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const socket=io(),host=document.querySelector('#viewport'),scene=new THREE.Scene();scene.background=new THREE.Color(0x8eacc3);scene.fog=new THREE.Fog(0x8eacc3,24,65);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,100),renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x566373,2.1));const sun=new THREE.DirectionalLight(0xffe8b4,2.2);sun.position.set(14,25,-12);scene.add(sun);
const mat=c=>new THREE.MeshLambertMaterial({color:c}),floor=new THREE.Mesh(new THREE.PlaneGeometry(48,32),mat(0x64755e));floor.rotation.x=-Math.PI/2;scene.add(floor);
const grid=new THREE.GridHelper(48,48,0x3b5545,0x3b5545);grid.position.y=.015;scene.add(grid);
function box(x,z,w,h,height,color){const o=new THREE.Mesh(new THREE.BoxGeometry(w,height,h),mat(color));o.position.set(x+w/2,height/2,z+h/2);scene.add(o);return o;}
box(-24,-16,48,.7,4,0x58636b);box(-24,15.3,48,.7,4,0x58636b);box(-24,-16,.7,32,4,0x58636b);box(23.3,-16,.7,32,4,0x58636b);
let id=null,team='',players=[],yaw=0,pitch=0,ready=false,gunKick=0,shotFlash=0;
const avatars=new Map(),keys=new Set(),clock=new THREE.Clock(),gun=new THREE.Group();camera.add(gun);scene.add(camera);
const body=new THREE.Mesh(new THREE.BoxGeometry(.18,.19,.7),mat(0x28323a));body.position.set(.3,-.28,-.6);gun.add(body);
const grip=new THREE.Mesh(new THREE.BoxGeometry(.14,.28,.16),mat(0x151a1e));grip.position.set(.29,-.48,-.38);gun.add(grip);
const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.3,8),mat(0x151a1e));barrel.rotation.x=Math.PI/2;barrel.position.set(.3,-.28,-1.06);gun.add(barrel);
function spawnMap(obstacles){for(const [x,z,w,h] of obstacles)box(x,z,w,h,2.4,[0x87929a,0x8a765f,0x697e82][Math.abs(x+z)%3]);}
document.querySelector('#join').onclick=()=>socket.emit('join',document.querySelector('#name').value);
socket.on('welcome',v=>{id=v.id;team=v.team;ready=true;spawnMap(v.obstacles);document.querySelector('#menu').style.display='none';document.querySelector('#team').textContent=team.toUpperCase()+' TEAM';document.querySelector('#team').style.color=team==='red'?'#ff7979':'#80baff';});
socket.on('state',s=>{players=s.players;document.querySelector('#score').textContent='🔴 '+s.scores.red+' : '+s.scores.blue+' 🔵';document.querySelector('#timer').textContent=String(Math.floor(s.timeLeft/60)).padStart(2,'0')+':'+String(s.timeLeft%60).padStart(2,'0');document.querySelector('#online').textContent=s.players.length+' online';const me=players.find(p=>p.id===id);if(me){document.querySelector('#hp').textContent='♥ '+me.hp;document.querySelector('#ammo').textContent=me.reloading?'RELOADING':me.ammo+' / ∞';document.querySelector('#kd').textContent='K '+me.kills+' / D '+me.deaths;}syncAvatars();});
socket.on('notice',s=>{const f=document.querySelector('#feed');f.textContent=s;setTimeout(()=>{if(f.textContent===s)f.textContent='';},3500);});
socket.on('shot',s=>{if(s.id===id){gunKick=.16;if(s.hit){const m=document.querySelector('#hitmarker');m.style.opacity='1';setTimeout(()=>m.style.opacity='0',120);}}});
function syncAvatars(){const seen=new Set();for(const p of players){if(p.id===id||p.hp<=0)continue;seen.add(p.id);let a=avatars.get(p.id);if(!a){a=new THREE.Group();const torso=new THREE.Mesh(new THREE.BoxGeometry(.65,.95,.38),mat(p.team==='red'?0xd94d4d:0x428fe2));torso.position.y=1.15;a.add(torso);const head=new THREE.Mesh(new THREE.BoxGeometry(.4,.42,.4),mat(0xdcb692));head.position.y=1.85;a.add(head);const legs=new THREE.Mesh(new THREE.BoxGeometry(.48,.65,.32),mat(0x343d47));legs.position.y=.36;a.add(legs);scene.add(a);avatars.set(p.id,a);}a.position.set(p.x,0,p.z);a.rotation.y=p.yaw;}for(const [key,a] of avatars)if(!seen.has(key)){scene.remove(a);avatars.delete(key);}}
renderer.domElement.addEventListener('click',()=>{if(ready&&document.pointerLockElement!==renderer.domElement)renderer.domElement.requestPointerLock();});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement){yaw-=e.movementX*.0023;pitch=Math.max(-1.35,Math.min(1.35,pitch-e.movementY*.0023));}});
addEventListener('keydown',e=>{if(document.activeElement.tagName==='INPUT')return;keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='r')socket.emit('reload');if(e.key.startsWith('Arrow')||e.key===' ')e.preventDefault();});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
renderer.domElement.addEventListener('mousedown',e=>{if(e.button===0&&document.pointerLockElement===renderer.domElement)socket.emit('shoot',{yaw});});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
setInterval(()=>{if(!ready)return;socket.emit('input',{forward:Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),strafe:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),yaw});},50);
function animate(){requestAnimationFrame(animate);const dt=Math.min(.05,clock.getDelta()),me=players.find(p=>p.id===id);if(me){camera.position.set(me.x,1.65,me.z);if(me.hp<=0){document.querySelector('#crosshair').textContent='RESPAWNING...';}else document.querySelector('#crosshair').textContent='+';}else camera.position.set(0,8,17);camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;gunKick=Math.max(0,gunKick-dt*.8);gun.position.z=gunKick;renderer.render(scene,camera);}animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
