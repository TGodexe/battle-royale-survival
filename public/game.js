import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const socket=io(),host=document.querySelector('#viewport'),hotbar=document.querySelector('#hotbar');
const scene=new THREE.Scene();scene.background=new THREE.Color('#93c8ed');scene.fog=new THREE.Fog('#93c8ed',18,43);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,75);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x66886a,2));const sun=new THREE.DirectionalLight(0xfff0ce,2);sun.position.set(10,30,15);scene.add(sun);
let id=null,world=[],players=[],inventory={},selected=0,yaw=0,pitch=0,ready=false;
const TILE=32,blocks=['dirt','stone','wood','grass','sand','leaves'],colors={grass:0x65ae4c,dirt:0x92623f,stone:0x87949b,wood:0xa57743,leaves:0x3c9a50,sand:0xe6cc83,water:0x4a9fd3,empty:0x263f29};
const mats=Object.fromEntries(Object.entries(colors).map(([k,c])=>[k,new THREE.MeshLambertMaterial({color:c,transparent:k==='water',opacity:k==='water'?.72:1})]));
const geo=new THREE.BoxGeometry(1,1,1),meshByTile=new Map(),avatars=new Map(),keys=new Set(),ray=new THREE.Raycaster();
const group=new THREE.Group();scene.add(group);
function makeTile(x,y,b){const key=x+','+y,old=meshByTile.get(key);if(old){group.remove(old);old.geometry.dispose();meshByTile.delete(key);}if(b==='empty')return;
 const h=b==='wood'?2.5:b==='leaves'?1.6:b==='stone'?1.3:.8;
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,h,1),mats[b]||mats.dirt);mesh.position.set(x+.5,h/2-.65,y+.5);mesh.userData={x,y,block:b};group.add(mesh);meshByTile.set(key,mesh);
}
function buildWorld(){for(let y=0;y<world.length;y++)for(let x=0;x<world[y].length;x++)makeTile(x,y,world[y][x]);}
function renderBar(){hotbar.replaceChildren();blocks.forEach((b,i)=>{const el=document.createElement('button');el.className='slot'+(selected===i?' selected':'');const sw=document.createElement('span');sw.className='swatch';sw.style.background='#'+colors[b].toString(16).padStart(6,'0');const title=document.createElement('span');title.textContent=(i+1)+'. '+b;const count=document.createElement('span');count.textContent=inventory[b]||0;el.append(sw,title,count);el.onclick=()=>{selected=i;renderBar();};hotbar.append(el);});}
document.querySelector('#join').onclick=()=>socket.emit('join',document.querySelector('#name').value);
socket.on('welcome',v=>{id=v.id;world=v.world;ready=true;buildWorld();document.querySelector('#menu').style.display='none';renderBar();});
socket.on('players',p=>{players=p;document.querySelector('#online').textContent=p.length+' player(s) online';syncAvatars();});
socket.on('tile',t=>{if(world[t.y]){world[t.y][t.x]=t.block;makeTile(t.x,t.y,t.block);}});
socket.on('inventory',i=>{inventory=i;renderBar();});
socket.on('connect_error',()=>document.querySelector('#online').textContent='Connection error');
function syncAvatars(){const seen=new Set();for(const p of players){if(p.id===id)continue;seen.add(p.id);let a=avatars.get(p.id);if(!a){a=new THREE.Mesh(new THREE.BoxGeometry(.55,1.7,.45),new THREE.MeshLambertMaterial({color:p.color}));scene.add(a);avatars.set(p.id,a);}a.position.set(p.x/TILE,.5,p.y/TILE);}for(const [key,a] of avatars)if(!seen.has(key)){scene.remove(a);avatars.delete(key);}}
renderer.domElement.addEventListener('click',()=>{if(ready&&document.pointerLockElement!==renderer.domElement)renderer.domElement.requestPointerLock();});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement){yaw-=e.movementX*.0025;pitch=Math.max(-1.45,Math.min(1.45,pitch-e.movementY*.0025));}});
addEventListener('keydown',e=>{if(document.activeElement.tagName==='INPUT')return;keys.add(e.key.toLowerCase());if(/^[1-6]$/.test(e.key)){selected=Number(e.key)-1;renderBar();}if(e.key.startsWith('Arrow')||e.key===' ')e.preventDefault();});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
setInterval(()=>{if(!id)return;const f=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),s=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));const dx=-Math.sin(yaw)*f+Math.cos(yaw)*s,dy=-Math.cos(yaw)*f-Math.sin(yaw)*s;socket.emit('input',{up:dy<-.15,down:dy>.15,left:dx<-.15,right:dx>.15});},50);
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('mousedown',e=>{if(!id||document.pointerLockElement!==renderer.domElement)return;if(e.button!==0&&e.button!==2)return;ray.setFromCamera(new THREE.Vector2(0,0),camera);ray.far=5;const hits=ray.intersectObjects(group.children,false);if(!hits.length)return;const hit=hits[0],x=hit.object.userData.x,y=hit.object.userData.y;
 if(e.button===0)socket.emit('edit',{x,y,action:'mine'});
 else {const nx=x+Math.round(hit.face.normal.x),ny=y+Math.round(hit.face.normal.z);socket.emit('edit',{x:nx,y:ny,action:'place',block:blocks[selected]});}
});
function animate(){requestAnimationFrame(animate);const me=players.find(p=>p.id===id);if(me){camera.position.set(me.x/TILE,1.55,me.y/TILE);document.querySelector('#coords').textContent='X: '+Math.floor(me.x/TILE)+' Z: '+Math.floor(me.y/TILE);}else camera.position.set(40,12,27);
camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;if(!me){camera.lookAt(40,0,26);}
renderer.render(scene,camera);}animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
