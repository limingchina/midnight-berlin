// Fixed-step, metre-space arcade vehicle. Static polygon buildings are authoritative.
export const SPAWN = [13.39058,52.516977];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function pointInRing(x,z,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function inBuilding(x,z,rings){return pointInRing(x,z,rings[0])&&!rings.slice(1).some(r=>pointInRing(x,z,r));}
export function nearestEdge(x,z,rings){let best={d:Infinity};for(const ring of rings)for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1),px=a[0]+dx*t,pz=a[1]+dz*t,d=Math.hypot(x-px,z-pz);if(d<best.d)best={d,x:px,z:pz,ex:dx,ez:dz};}return best;}
export function circleContact(x,z,r,b){if(x<b.minX-r||x>b.maxX+r||z<b.minZ-r||z>b.maxZ+r)return null;const e=nearestEdge(x,z,b.rings),inside=inBuilding(x,z,b.rings);if(!inside&&e.d>=r)return null;let nx=(x-e.x)/(e.d||1),nz=(z-e.z)/(e.d||1);if(inside){nx=-nx;nz=-nz;}if(e.d<1e-8){nx=-e.ez;nz=e.ex;const len=Math.hypot(nx,nz)||1;nx/=len;nz/=len;if(inBuilding(x+nx*.01,z+nz*.01,b.rings)){nx=-nx;nz=-nz;}}return {nx,nz,depth:inside?r+e.d:r-e.d};}
export function rayDistance(x,z,dx,dz,buildings,max=45){let near=max;for(const b of buildings){if(Math.hypot((b.minX+b.maxX)/2-x,(b.minZ+b.maxZ)/2-z)>max+Math.hypot(b.maxX-b.minX,b.maxZ-b.minZ))continue;for(const ring of b.rings)for(let i=0;i<ring.length-1;i++){const a=ring[i],q=ring[i+1],ex=q[0]-a[0],ez=q[1]-a[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const ax=a[0]-x,az=a[1]-z,t=(ax*ez-az*ex)/den,u=(ax*dz-az*dx)/den;if(t>0&&t<near&&u>=0&&u<=1)near=t;}}return near;}
export class Vehicle{
 constructor(){this.reset();}
 reset(){Object.assign(this,{x:0,z:0,vx:0,vz:0,heading:1.461,steer:0,speed:0,roll:0,distance:0,damage:0,impact:0,drift:0,boost:1});}
 step(dt,input,buildings=[]){
  this.impact=Math.max(0,this.impact-dt*2.5);
  this.steer+=(input.steer*.48-this.steer)*Math.min(1,dt*8);
  const fx=Math.sin(this.heading),fz=-Math.cos(this.heading),rx=Math.cos(this.heading),rz=Math.sin(this.heading);
  let forward=this.vx*fx+this.vz*fz,lateral=this.vx*rx+this.vz*rz;
  let accel=0;
  if(input.throttle)accel+=forward<-.5?19:input.boost&&this.boost>.02?17:10;
  if(input.brake)accel-=forward>.7?23:6;
  if(input.boost&&input.throttle&&this.boost>.02)this.boost=Math.max(0,this.boost-dt*.17);else this.boost=Math.min(1,this.boost+dt*.07);
  accel-=forward*(.3+Math.abs(forward)*.009);
  if(input.handbrake)accel-=forward*2.5;
  forward=clamp(forward+accel*dt,-8,48);
  lateral*=Math.exp(-(input.handbrake?1.4:8)*dt);
  this.heading+=Math.tan(this.steer)*forward/2.7*dt/(1+Math.abs(forward)*.025);
  const nfx=Math.sin(this.heading),nfz=-Math.cos(this.heading),nrx=Math.cos(this.heading),nrz=Math.sin(this.heading);
  // Inertia remains in world space; tyre grip pulls velocity into the new direction.
  const inertia=clamp((input.handbrake?.94:.38)*Math.abs(forward)/14,0,input.handbrake?.94:.65);
  this.vx=(nfx*forward+nrx*lateral)*(1-inertia)+(fx*forward+rx*lateral)*inertia;
  this.vz=(nfz*forward+nrz*lateral)*(1-inertia)+(fz*forward+rz*lateral)*inertia;
  this.x+=this.vx*dt;this.z+=this.vz*dt;
  for(let pass=0;pass<3;pass++)for(const b of buildings)for(const offset of [-1.25,0,1.25]){
   const c=circleContact(this.x+nfx*offset,this.z+nfz*offset,1.02,b);if(!c)continue;
   this.x+=c.nx*(c.depth+.003);this.z+=c.nz*(c.depth+.003);
   const vn=this.vx*c.nx+this.vz*c.nz;if(vn<0){const hit=-vn;this.vx-=1.18*vn*c.nx;this.vz-=1.18*vn*c.nz;this.vx*=.75;this.vz*=.75;if(hit>1.3){this.impact=1;this.damage=clamp(this.damage+hit*.5,0,100);}}
  }
  this.speed=this.vx*nfx+this.vz*nfz;this.roll+=this.speed*dt/.36;this.distance+=Math.hypot(this.vx,this.vz)*dt;this.drift=Math.abs(this.vx*nrx+this.vz*nrz);
 }
}
