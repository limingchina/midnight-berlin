import test from 'node:test';import assert from 'node:assert/strict';
// Geometry-only QA uses real Three.js and a minimal canvas drawing stub; no WebGL is emulated.
const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(()=>{})});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const {createCar,createBuilding,buildingMaterials}=await import('../dist/scene.js');
const {Vehicle}=await import('../dist/physics.js');
test('steering turns both front wheels and rolling rotates all four',()=>{const c=createCar(),v=new Vehicle();for(let i=0;i<90;i++)v.step(1/120,{steer:.8,throttle:true});c.update(v,{throttle:true},[]);assert.equal(c.front.length,2);assert.equal(c.wheels.length,4);assert(c.front.every(p=>p.rotation.y<-.2));assert(c.wheels.every(p=>Math.abs(p.rotation.x)>1));});
test('headlights have real spotlights, beams, ground pools, and off switch',()=>{const c=createCar(),v=new Vehicle();c.update(v,{},[]);assert(c.spots.every(s=>s.isSpotLight&&s.visible));assert(c.beams.every(b=>b.visible&&b.scale.z>30));c.lights=false;c.update(v,{},[]);assert(c.spots.every(s=>!s.visible));assert(c.beams.every(b=>!b.visible));assert(c.pools.every(p=>!p.visible));});
test('headlight columns shorten at nearby building wall',()=>{const c=createCar(),v=new Vehicle();v.heading=Math.PI/2;const b={minX:10,minZ:-10,maxX:12,maxZ:10,rings:[[[10,-10],[12,-10],[12,10],[10,10],[10,-10]]]};c.update(v,{},[b]);assert(c.beams.every(b=>b.scale.z>5&&b.scale.z<8));c.night=false;c.update(v,{},[]);assert(c.beams.every(b=>!b.visible));});
test('real polygon extrusion maps height to world-up and retains footprint',()=>{const b=createBuilding([[[10,10],[25,10],[25,20],[10,20],[10,10]]],18,0,buildingMaterials(true));b.geometry.computeBoundingBox();const bb=b.geometry.boundingBox;assert(Math.abs(bb.max.y-18)<1e-6);assert(Math.abs(bb.min.y)<1e-6);assert.equal(bb.min.x,10);assert.equal(bb.max.z,20);assert(b.receiveShadow);});
