// moti 3D 모션 (손으로 만든 동작 23개: RIG)
// Procedural motions for the rigged Jihu model. Rotations are given in the model's rest world frame
// (+X = character's left, +Y = up, +Z = toward camera) and carried along by parent bones.
const RIG=(()=>{
const PI=Math.PI,sin=Math.sin,abs=Math.abs,max=Math.max,min=Math.min;
const osc=(t,f,p=0)=>sin(t*f*2*PI+p);
const sm=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
const env=(t,d,a=.35,b=.4)=>sm(min(t/a,(d-t)/b,1));
const pulse=(t,c,w)=>sm(1-abs(t-c)/w);
const L=(P,b,x,y,z)=>{if(x)P.r(b,"x",x);if(y)P.r(b,"y",y);if(z)P.r(b,"z",z)};
const M={
 m01:{d:1.6,f(t,e,P){const b=abs(osc(t,2.5))*e;L(P,"Spine01",-.06*b);L(P,"Head",-.1*b,0,.12*e);L(P,"LeftShoulder",0,0,.1*b);L(P,"RightShoulder",0,0,-.1*b);P.m(0,.012*b,0)}},
 m02:{d:1.6,f(t,e,P){const n=max(0,osc(t,1.5,-PI/2))*e;L(P,"neck",.08*n);L(P,"Head",.26*n)}},
 m03:{d:1.4,f(t,e,P){const k=sm(min(t/.15,(1.4-t)/.5,1));L(P,"Spine",-.16*k);L(P,"Head",-.14*k);L(P,"LeftArm",-.35*k,0,.45*k);L(P,"RightArm",-.35*k,0,-.45*k);L(P,"LeftForeArm",-1*k);L(P,"RightForeArm",-1*k);P.m(0,.03*pulse(t,.15,.2),0)}},
 m04:{d:2.2,f(t,e,P){L(P,"Spine01",.16*e);L(P,"Head",.3*e);L(P,"LeftShoulder",0,0,-.08*e);L(P,"RightShoulder",0,0,.08*e);P.m(0,-.01*e,0)}},
 m05:{d:1.9,f(t,e,P){L(P,"neck",0,.15*e);L(P,"Head",.18*e,.5*e,-.05*e)}},
 m06:{d:1.7,f(t,e,P){L(P,"LeftArm",-(.7+.45*osc(t,4))*e,0,-.1*e);L(P,"RightArm",-(.7-.45*osc(t,4))*e,0,.1*e);L(P,"LeftForeArm",-1*e);L(P,"RightForeArm",-1*e);L(P,"Head",.08*e,.25*osc(t,3)*e)}},
 m07:{d:2.3,f(t,e,P){L(P,"LeftArm",-.35*e,0,-.18*e);L(P,"RightArm",-.35*e,0,.18*e);P.r("LeftForeArm","x",-1.5*e);P.r("LeftForeArm","y",-1.25*e);P.r("RightForeArm","x",-1.5*e);P.r("RightForeArm","y",1.25*e);L(P,"Spine",-.05*e);L(P,"Head",-.05*e,0,.1*e)}},
 m08:{d:2.3,f(t,e,P){L(P,"RightArm",-(1.85+.12*osc(t,2.5))*e,0,.2*e);L(P,"RightForeArm",-.35*e);L(P,"RightHand",.45*e);L(P,"Spine",.1*e);L(P,"Head",.06*e,0,-.12*e)}},
 m09:{d:1.6,f(t,e,P){const k=sm(min(t/.35,(1.6-t)/.6,1));L(P,"RightArm",-1.2*k,0,.15*k);L(P,"RightForeArm",-.3*k);L(P,"Spine",0,.22*k);L(P,"Head",.12*k,-.15*k)}},
 m10:{d:2.6,f(t,e,P){L(P,"Hips",0,2.7*e);L(P,"Head",.1*e)}},
 m11:{d:2.1,f(t,e,P){L(P,"RightArm",-1.15*e,0,.12*e);L(P,"RightForeArm",-.25*e);L(P,"Spine01",.08*e);L(P,"Head",.1*e,0,-.06*e)}},
 m12:{d:2.2,f(t,e,P){P.m(0,.012*abs(osc(t,1.8))*e,.42*e);L(P,"Spine01",.08*e);L(P,"Head",.05*e,0,.1*e);L(P,"LeftArm",-.15*osc(t,.9)*e);L(P,"RightArm",.15*osc(t,.9)*e)}},
 m13:{d:2.2,f(t,e,P){L(P,"RightArm",-.2*e,0,-1.25*e);P.r("RightForeArm","z",-(1.9+.32*osc(t,2.2))*e);L(P,"Head",0,0,.12*e)}},
 m14:{d:2.3,f(t,e,P){L(P,"RightArm",-1.35*e,0,-.75*e);L(P,"RightForeArm",-.45*e);L(P,"LeftArm",-.35*e,0,-.05*e);L(P,"LeftForeArm",-2.3*e);L(P,"Head",0,-.15*e,.22*e);L(P,"Spine",0,-.08*e)}},
 m15:{d:2.4,f(t,e,P){const bow=pulse(t,.75,.6),w=sm(min((t-1.1)/.3,(2.4-t)/.4,1));L(P,"Spine02",.32*bow);L(P,"Head",.18*bow+.05*w,0,.12*w);L(P,"RightArm",-.25*w,0,-.3*w);P.r("RightForeArm","x",-1.7*w);P.r("RightForeArm","y",.25*osc(t,2.2)*w)}},
 m16:{d:2.2,f(t,e,P){const a=(2.35+.3*osc(t,2.3))*e;L(P,"LeftArm",-.25*e,0,a);L(P,"RightArm",-.25*e,0,-a);L(P,"LeftForeArm",0,0,.25*e);L(P,"RightForeArm",0,0,-.25*e);L(P,"Head",-.12*e);P.m(0,.035*abs(osc(t,1.15))*e,0)}},
 m17:{d:1.9,f(t,e,P){L(P,"Head",.12*max(0,osc(t,1.2,-PI/2))*e,-.3*e);L(P,"RightShoulder",0,0,-.12*pulse(t,.9,.5));L(P,"Spine",0,-.1*e)}},
 m18:{d:2.6,f(t,e,P){P.m(0,0,.38*e);L(P,"LeftArm",-1.25*e,0,-.3*e);L(P,"RightArm",-1.25*e,0,.3*e);P.r("LeftForeArm","x",-.5*e);P.r("LeftForeArm","y",-1*e);P.r("RightForeArm","x",-.5*e);P.r("RightForeArm","y",1*e);L(P,"Spine01",.1*e);L(P,"Head",.1*e,0,.15*e)}},
 m19:{d:2.5,f(t,e,P){L(P,"Spine",-.08*e,.14*osc(t,.8)*e);L(P,"RightArm",-.7*e,0,-.3*e);L(P,"RightForeArm",-(1.05+.3*osc(t,1.6))*e);L(P,"LeftArm",0,0,.12*e);L(P,"Head",0,0,.08*osc(t,.8)*e)}},
 m20:{d:2.3,f(t,e,P){L(P,"Spine",-.12*e);L(P,"Head",-.12*e,0,-.16*e);L(P,"RightArm",-.95*e,0,-.15*e);L(P,"RightForeArm",-(.7+.7*max(0,osc(t,2.4)))*e);L(P,"LeftArm",.25*e,0,.5*e);P.r("LeftForeArm","x",-.6*e);P.r("LeftForeArm","y",-1.2*e)}},
 m21:{d:1.7,f(t,e,P){const k1=pulse(t,.45,.22),k2=pulse(t,.95,.22);L(P,"LeftArm",-(.85+.65*k1)*e,0,-.12*e);L(P,"RightArm",-(.85+.65*k2)*e,0,.12*e);L(P,"LeftForeArm",-(1.9-1.75*k1)*e);L(P,"RightForeArm",-(1.9-1.75*k2)*e);L(P,"Spine",.05*e,(-.3*k1+.3*k2)*e);L(P,"Head",.08*e)}},
 m22:{d:2.6,f(t,e,P){L(P,"LeftArm",-.15*e,0,2.55*e);L(P,"RightArm",-.15*e,0,-2.55*e);L(P,"LeftForeArm",0,0,1.35*e);L(P,"RightForeArm",0,0,-1.35*e);L(P,"Head",0,0,.15*osc(t,1.2)*e);L(P,"Spine",0,0,.05*osc(t,1.2)*e);P.m(0,.02*abs(osc(t,1.2))*e,0)}},
 m23:{d:3.2,f(t,e,P){const p=t*2*PI*.95;L(P,"Spine02",.13*sin(p)*e);L(P,"Spine01",.15*sin(p-.9)*e);L(P,"Spine",.15*sin(p-1.8)*e);L(P,"Head",.13*sin(p-2.7)*e);L(P,"Hips",0,0,.07*sin(p/2)*e);P.m(.035*sin(p/2)*e,.02*sin(p)*e,0);L(P,"LeftArm",-.2*e,0,(.45+.25*sin(p))*e);L(P,"RightArm",-.2*e,0,-(.45+.25*sin(p+PI))*e);L(P,"LeftForeArm",-.7*e);L(P,"RightForeArm",-.7*e)}}
};
function idle(t,P){L(P,"Spine01",.015*sin(t*1.6));L(P,"Head",.02*sin(t*.7),.06*sin(t*.45),.03*sin(t*.6));L(P,"LeftArm",0,0,-.05);L(P,"RightArm",0,0,.05)}
// quaternion helpers [x,y,z,w]
const q={mul(a,b){return[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]},
 ax(k,a){const s=sin(a/2),c=Math.cos(a/2);return k==="x"?[s,0,0,c]:k==="y"?[0,s,0,c]:[0,0,s,c]},inv(a){return[-a[0],-a[1],-a[2],a[3]]}};
// rest: {name:{local:[q], world:[q]}}; returns {local quats by bone, offset}
function pose(rest,motion,mt,t){
  const R={};const off=[0,0,0];
  const P={r(b,k,a){if(!rest[b]||!a)return;R[b]=q.mul(q.ax(k,a),R[b]||[0,0,0,1])},m(x,y,z){off[0]+=x;off[1]+=y;off[2]+=z}};
  idle(t,P);
  if(motion&&M[motion]){const d=M[motion].d;M[motion].f(mt,env(mt,d),P)}
  const out={};
  for(const b in rest){const r=rest[b];if(!R[b]){out[b]=r.local;continue}
    out[b]=q.mul(r.local,q.mul(q.inv(r.world),q.mul(R[b],r.world)))}
  return{local:out,off};
}
return{M,pose,q};
})();


