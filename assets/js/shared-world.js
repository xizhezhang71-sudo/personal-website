import * as T from '../vendor/three.module.min.js';
import {loadRobot} from './robot.js?v=pose-sync-35';
import {mountRipples} from './ripples.js?v=performance-22';
const stage=document.querySelector('#shared-stage');
const about=location.pathname.endsWith('/about.html');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
// Same confirmed wrist and palm offsets as Work's first and final frame.
const WORK_ENDPOINT_LIMB_POSE={
 Right:{wrist:{position:{x:-.70,y:-.70,z:-.30},rotation:{x:4,y:2,z:-4}},palm:{position:{x:-.69,y:-.08,z:0},rotation:{x:-41,y:2,z:6}}},
 Left:{wrist:{position:{x:.70,y:-.02,z:.34},rotation:{x:-21,y:-1,z:1}},palm:{position:{x:.70,y:-.70,z:.70},rotation:{x:2,y:3,z:1}}}
};
mountRipples(stage,reduced,{ambient:true});
async function start(){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true});
 const camera=new T.PerspectiveCamera(35,1,.1,80),scene=new T.Scene();
 const robot=await loadRobot({surfaceOpacity:.70,filmMotion:true,stanceHalfWidth:.52,portraitPose:true});scene.add(robot.rig);
 const poseBones=[];
 robot.rig.traverse(object=>{if(object.isBone)poseBones.push({bone:object,rotation:new T.Quaternion(),position:new T.Vector3()});});
 scene.add(new T.HemisphereLight(0xd8faff,0x3833b0,.85));
 for(const [color,intensity,x,y,z] of [[0xffffff,2.1,-3,6,5],[0x00ffee,3.6,-4,3,-2],[0xff328a,1.25,4,1,2]]){const l=new T.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l);}
 stage.append(renderer.domElement);let frame=0;
 function draw(now){frame=0;if(document.hidden)return;
 let p=reduced.matches?0:Math.min(1,scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight));
 if(about){
   const story=document.querySelector('.about-story');
   p=reduced.matches?0:T.MathUtils.clamp(-story.getBoundingClientRect().top/(innerHeight*1.15),0,1);
   const t=T.MathUtils.smoothstep(p,0,1);
   const distance=T.MathUtils.lerp(6,4.05,t),target=T.MathUtils.lerp(1.1,1.45,t);
   const pitch=T.MathUtils.degToRad(T.MathUtils.lerp(-20,20,t));
   camera.position.set(0,target+Math.tan(pitch)*distance,distance);camera.lookAt(0,target,0);
   robot.rig.position.set(distance*camera.aspect*T.MathUtils.lerp(.154,-.16,t),0,0);
   robot.rig.rotation.y=T.MathUtils.lerp(-.22,.30,t);
   robot.animateAboutTransition(p,reduced.matches,now*.001);
   const profile=1-T.MathUtils.smoothstep(p,.12,.48),skills=T.MathUtils.smoothstep(p,.42,.82);
   story.style.setProperty('--profile-opacity',profile);story.style.setProperty('--profile-y',-80*(1-profile)+'px');
   story.style.setProperty('--skills-opacity',skills);story.style.setProperty('--skills-y',80*(1-skills)+'px');
   document.querySelector('.about-profile').inert=!reduced.matches&&profile<.05;
   document.querySelector('.about-skills').inert=!reduced.matches&&skills<.05;
 }else{
   camera.position.set(0,.55,6);camera.lookAt(0,1.1,0);
   const closing=T.MathUtils.smoothstep(p,.65,.95);
   robot.rig.position.set(T.MathUtils.lerp(6*camera.aspect*.154-Math.sin(p*Math.PI)*.45,-6*camera.aspect*.16,closing),0,0);
   robot.rig.rotation.y=T.MathUtils.lerp(-.42+p*Math.PI*2,Math.PI*2+.30,closing);
   robot.animate(p*3,reduced.matches,now*.001);
   robot.introduce(closing,reduced.matches,now*.001);
 }
 // Keep the shared opening on Work's exact first-frame composition before
 // each page begins its own camera and pose sequence. Portfolio holds it
 // through its first two opening beats; About holds it through its first beat.
 const holdEnd=about?.12:.22;
 const transition=T.MathUtils.smoothstep(p,holdEnd,holdEnd+.25);
 if(about && transition===0){
   // About's first beat is exactly Work's static first frame.
   robot.animate(0,true,0);
 }
 if(!about && transition<1){
   for(const pose of poseBones){pose.rotation.copy(pose.bone.quaternion);pose.position.copy(pose.bone.position);}
   robot.animate(0,reduced.matches||transition===0,transition===0?0:now*.001,.38*transition);
   for(const pose of poseBones){pose.bone.quaternion.slerp(pose.rotation,transition);pose.bone.position.lerp(pose.position,transition);}
 }
 // Apply Work's verified hand endpoints before the page-specific motion
 // gradually takes over, so the opening frames agree visually.
 robot.applyLimbTuning(WORK_ENDPOINT_LIMB_POSE,1-transition);
 const narrow=innerWidth<680;
 const openingDistance=narrow?4.72:3.76;
 const openingX=openingDistance*camera.aspect*(narrow?.084:.24);
 robot.rig.position.x=T.MathUtils.lerp(openingX,robot.rig.position.x,transition);
 robot.rig.rotation.y=T.MathUtils.lerp(-Math.PI/6,robot.rig.rotation.y,transition);
 const distance=T.MathUtils.lerp(openingDistance,camera.position.z,transition);
 const target=T.MathUtils.lerp(.98,about?T.MathUtils.lerp(1.1,1.45,T.MathUtils.smoothstep(p,0,1)):1.1,transition);
 const cameraY=T.MathUtils.lerp(.98-openingDistance*Math.tan(26*Math.PI/180),camera.position.y,transition);
 const cameraX=robot.rig.position.x*(1-transition);
 camera.position.set(cameraX,cameraY,distance);camera.lookAt(cameraX,target,0);
 camera.fov=T.MathUtils.lerp(narrow?41:43.5,35,transition);
 const halfWidth=Math.hypot(distance,target-cameraY)*Math.tan(camera.fov*Math.PI/360)*camera.aspect;
 camera.setViewOffset(innerWidth,innerHeight,-cameraX/(2*halfWidth)*innerWidth,0,innerWidth,innerHeight);
 robot.setPhase(reduced.matches?0:.48+.18*Math.sin(p*3.6)+.17*Math.sin(now*.00155));
 renderer.render(scene,camera);if(!reduced.matches)frame=requestAnimationFrame(draw);
 }
 function wake(){if(!frame)frame=requestAnimationFrame(draw);}
 function resize(){renderer.setPixelRatio(Math.min(devicePixelRatio,1.15));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();wake();}
 addEventListener('resize',resize);addEventListener('scroll',wake,{passive:true});document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',resize);resize();
}
start().catch(error=>console.warn('Robot background unavailable',error));
