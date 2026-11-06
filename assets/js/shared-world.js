import * as T from '../vendor/three.module.min.js';
import {loadRobot} from './robot.js?v=pose-sync-35';
import {mountRipples} from './ripples.js?v=cursor-mask-23';
import {
 OPENING_FRAME,
 OPENING_IDLE_SCALE,
 OVERHEAD_MEDIUM_FRAME,
 SHARED_PAGE_END_FRAME,
 WORK_ENDPOINT_LIMB_POSE
} from './scene-frames.js?v=story-frame-37';
const stage=document.querySelector('#shared-stage');
const about=location.pathname.endsWith('/about.html');
const research=location.pathname.endsWith('/research.html');
const portfolio=location.pathname.endsWith('/experience.html');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
mountRipples(stage,reduced,{ambient:true});
async function start(){
 if(portfolio)document.querySelectorAll('.reading')[1]?.classList.add('experience-reading');
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
 const experience=portfolio?document.querySelector('.experience-reading'):null;
 const experienceRect=experience?.getBoundingClientRect();
 const experienceIn=experienceRect?(reduced.matches?1:T.MathUtils.smoothstep((innerHeight-experienceRect.top)/(innerHeight*.58),0,1)):0;
 // Begin changing the model shortly before Experience enters, and finish as
 // the panel settles into its visible position.
 const portfolioEnding=experienceRect?T.MathUtils.smoothstep((innerHeight*1.35-experienceRect.top)/(innerHeight*.90),0,1):0;
 const researchMiddleBeat=research?T.MathUtils.smoothstep(p,.32,.52)*(1-T.MathUtils.smoothstep(p,.52,.74)):0;
 const sharedEnding=research?T.MathUtils.smoothstep(p,.82,1):portfolioEnding;
 const sharedReference=Math.max(researchMiddleBeat,sharedEnding);
 if(about){
   const story=document.querySelector('.about-story');
   // Reach the reference frame only at the actual page bottom; there is no
   // hidden scroll interval or subsequent camera beat after it.
   p=reduced.matches?0:T.MathUtils.clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight),0,1);
   const t=T.MathUtils.smoothstep(p,0,1);
   const reference=OVERHEAD_MEDIUM_FRAME;
   const distance=T.MathUtils.lerp(6,reference.distance,t),target=T.MathUtils.lerp(1.1,reference.target,t);
   const pitch=T.MathUtils.degToRad(T.MathUtils.lerp(-20,reference.cameraPitchDegrees,t));
   camera.position.set(0,target+Math.tan(pitch)*distance,distance);camera.lookAt(0,target,0);
   robot.rig.position.set(distance*camera.aspect*T.MathUtils.lerp(.154,reference.rigFramingOffset,t),0,0);
   robot.rig.rotation.y=T.MathUtils.lerp(-.22,reference.rigRotationY,t);
   robot.animateAboutTransition(p,reduced.matches,now*.001);
   const profile=1-T.MathUtils.smoothstep(p,.12,.48),skills=T.MathUtils.smoothstep(p,.42,.82);
   story.style.setProperty('--profile-opacity',profile);story.style.setProperty('--profile-y',-80*(1-profile)+'px');
   story.style.setProperty('--skills-opacity',skills);story.style.setProperty('--skills-y',80*(1-skills)+'px');
   document.querySelector('.about-profile').inert=!reduced.matches&&profile<.05;
   document.querySelector('.about-skills').inert=!reduced.matches&&skills<.05;
 }else{
   const end=SHARED_PAGE_END_FRAME;
   camera.position.set(0,end.cameraY,end.distance);camera.lookAt(0,end.target,0);
   if(portfolio){
     // Hold the shared opening pose until Experience approaches. The common
     // interpolation below then changes it directly into the final frame.
     const reference=OVERHEAD_MEDIUM_FRAME;
     const referenceY=reference.target+Math.tan(T.MathUtils.degToRad(reference.cameraPitchDegrees))*reference.distance;
     camera.position.set(0,referenceY,reference.distance);camera.lookAt(0,reference.target,0);
     robot.rig.position.set(reference.distance*camera.aspect*reference.rigFramingOffset,0,0);
     robot.rig.rotation.y=reference.rigRotationY;
     robot.animateAbout(1,reduced.matches,now*.001);
   }else{
     const closing=T.MathUtils.smoothstep(p,.65,.95);
     robot.rig.position.set(T.MathUtils.lerp(end.distance*camera.aspect*.154-Math.sin(p*Math.PI)*.45,end.distance*camera.aspect*end.rigFramingOffset,closing),0,0);
     robot.rig.rotation.y=T.MathUtils.lerp(-.42+p*Math.PI*2,end.rigRotationY,closing);
     robot.animate(p*3,reduced.matches,now*.001);
     robot.introduce(closing,reduced.matches,now*.001);
   }
   if(research){
     // Research passes through the reference frame mid-scroll and resolves to
     // About's exact camera and pose at its shared endpoint.
     const referenceAmount=sharedReference;
     if(referenceAmount>.001){
       for(const pose of poseBones){pose.rotation.copy(pose.bone.quaternion);pose.position.copy(pose.bone.position);}
       robot.animateAbout(1,reduced.matches,now*.001);
       for(const pose of poseBones){
         pose.bone.quaternion.slerpQuaternions(pose.rotation,pose.bone.quaternion.clone(),referenceAmount);
         pose.bone.position.lerpVectors(pose.position,pose.bone.position.clone(),referenceAmount);
       }
       const reference=OVERHEAD_MEDIUM_FRAME;
       const referenceY=reference.target+Math.tan(T.MathUtils.degToRad(reference.cameraPitchDegrees))*reference.distance;
       camera.position.lerp(new T.Vector3(0,referenceY,reference.distance),referenceAmount);
       camera.lookAt(0,T.MathUtils.lerp(end.target,reference.target,referenceAmount),0);
       robot.rig.position.x=T.MathUtils.lerp(robot.rig.position.x,reference.distance*camera.aspect*reference.rigFramingOffset,referenceAmount);
       robot.rig.rotation.y=T.MathUtils.lerp(robot.rig.rotation.y,reference.rigRotationY,referenceAmount);
     }
   }
 }
 // Keep the shared opening on Work's exact first-frame composition before
 // each page begins its own camera and pose sequence. Portfolio holds it
 // through its first two opening beats; About holds it through its first beat.
 const holdEnd=about?.12:.22;
 const transition=T.MathUtils.smoothstep(p,holdEnd,holdEnd+.25);
 const compositionTransition=portfolio?sharedEnding:transition;
 if(about && transition===0){
   // About's first beat uses Work's exact, gently moving opening frame.
   robot.animate(0,reduced.matches,now*.001,OPENING_IDLE_SCALE);
 }
 if(!about && compositionTransition<1){
   for(const pose of poseBones){pose.rotation.copy(pose.bone.quaternion);pose.position.copy(pose.bone.position);}
   const idleScale=T.MathUtils.lerp(OPENING_IDLE_SCALE,.38,compositionTransition);
   robot.animate(0,reduced.matches,now*.001,idleScale);
   for(const pose of poseBones){pose.bone.quaternion.slerp(pose.rotation,compositionTransition);pose.bone.position.lerp(pose.position,compositionTransition);}
 }
 // Apply Work's verified hand endpoints before the page-specific motion
 // gradually takes over, so the opening frames agree visually.
 robot.applyLimbTuning(WORK_ENDPOINT_LIMB_POSE,1-compositionTransition);
 const narrow=innerWidth<680;
 const openingDistance=narrow?OPENING_FRAME.narrowDistance:OPENING_FRAME.distance;
 const openingX=openingDistance*camera.aspect*(narrow?OPENING_FRAME.narrowFramingOffset:OPENING_FRAME.framingOffset);
 robot.rig.position.x=T.MathUtils.lerp(openingX,robot.rig.position.x,compositionTransition);
 robot.rig.rotation.y=T.MathUtils.lerp(OPENING_FRAME.rigRotationY,robot.rig.rotation.y,compositionTransition);
 const distance=T.MathUtils.lerp(openingDistance,camera.position.z,compositionTransition);
 const aboutTarget=T.MathUtils.lerp(1.1,OVERHEAD_MEDIUM_FRAME.target,T.MathUtils.smoothstep(p,0,1));
 const sharedTarget=portfolio?OVERHEAD_MEDIUM_FRAME.target:T.MathUtils.lerp(SHARED_PAGE_END_FRAME.target,OVERHEAD_MEDIUM_FRAME.target,sharedReference);
 const target=T.MathUtils.lerp(OPENING_FRAME.target,about?aboutTarget:sharedTarget,compositionTransition);
 const cameraY=T.MathUtils.lerp(OPENING_FRAME.target+openingDistance*Math.tan(OPENING_FRAME.cameraPitchDegrees*Math.PI/180),camera.position.y,compositionTransition);
 const cameraX=robot.rig.position.x*(1-compositionTransition);
 camera.position.set(cameraX,cameraY,distance);camera.lookAt(cameraX,target,0);
 camera.fov=T.MathUtils.lerp(narrow?OPENING_FRAME.narrowFov:OPENING_FRAME.fov,35,compositionTransition);
 camera.updateProjectionMatrix();
 const halfWidth=Math.hypot(distance,target-cameraY)*Math.tan(camera.fov*Math.PI/360)*camera.aspect;
 camera.setViewOffset(innerWidth,innerHeight,-cameraX/(2*halfWidth)*innerWidth,0,innerWidth,innerHeight);
 robot.setPhase(reduced.matches?0:.48+.18*Math.sin(p*3.6)+.17*Math.sin(now*.00155));
 if(experience){
   experience.style.setProperty('--experience-opacity',experienceIn);
   experience.style.setProperty('--experience-y',(1-experienceIn)*80+'px');
   experience.inert=!reduced.matches&&experienceIn<.05;
 }
 renderer.render(scene,camera);if(!reduced.matches)frame=requestAnimationFrame(draw);
 }
 function wake(){if(!frame)frame=requestAnimationFrame(draw);}
 function resize(){renderer.setPixelRatio(Math.min(devicePixelRatio,1.15));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();wake();}
 addEventListener('resize',resize);addEventListener('scroll',wake,{passive:true});document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',resize);resize();
}
start().catch(error=>console.warn('Robot background unavailable',error));
