import * as T from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

export async function loadRobot(options={}) {
  const surfaceOpacity=T.MathUtils.clamp(options.surfaceOpacity??1,.15,1);
  const filmMotion=options.filmMotion===true;
  const { scene, animations } = await new GLTFLoader().loadAsync(
    new URL('../images/Xbot.glb', import.meta.url).href
  );
  const mixer = new T.AnimationMixer(scene);
  mixer.clipAction(animations.find(clip => clip.name === 'idle')).play();
  mixer.setTime(.8);
  scene.updateMatrixWorld(true);

  const rig = new T.Group();
  const body = new T.Group();
  const filmTime = { value: 0 };
  const filmPhase = { value: 0 };
  const bones = {};
  scene.traverse(object => {
    if (object.isBone) bones[object.name.replace('mixamorig', '').replace(':', '')] = object;
  });
  const restPose = new Map(Object.values(bones).map(bone => [bone, bone.quaternion.clone()]));
  const restPosition = new Map(Object.values(bones).map(bone => [bone, bone.position.clone()]));
  const restingHipPosition = bones.Hips?.position.clone();
  const bounds = new T.Box3().setFromObject(scene, true);
  const scale = 5 / bounds.getSize(new T.Vector3()).y;
  body.scale.setScalar(scale);
  body.position.copy(bounds.getCenter(new T.Vector3())).multiplyScalar(-scale);
  body.add(scene);
  // Remove the lateral lean baked into the sampled idle pose.
  if (bones.Hips && bones.Neck) {
    const axis=bones.Neck.getWorldPosition(new T.Vector3()).sub(bones.Hips.getWorldPosition(new T.Vector3()));
    body.rotation.z=Math.atan2(axis.x,axis.y);
    body.position.applyAxisAngle(new T.Vector3(0,0,1),body.rotation.z);
  }
  rig.add(body);

  const meshes = [];
  scene.traverse(object => { if (object.isMesh) meshes.push(object); });
  for (const mesh of meshes) {
    const joint = /joint/i.test(mesh.material.name);
    // Regular screened dots, not polygon edges. A single opaque surface keeps
    // the silhouette and depth stable while the dot coverage changes smoothly.
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const material = new T.MeshPhysicalMaterial({
      color: joint ? 0x182cd8 : 0x153cff,
      metalness: .12, roughness: .24, clearcoat: 1, clearcoatRoughness:.16,
      transparent: surfaceOpacity<.999, opacity: surfaceOpacity,
      depthWrite: true
    });
    material.onBeforeCompile = shader => {
      shader.uniforms.filmTime = filmTime;
      shader.uniforms.filmPhase = filmPhase;
      shader.uniforms.surfaceOrigin = {value:box.min.clone()};
      shader.uniforms.surfaceSpan = {value:box.getSize(new T.Vector3()).clampScalar(.001, Infinity)};
      shader.uniforms.dotPitch = {value:3.1 * Math.min(devicePixelRatio, 1.5)};
      shader.vertexShader = 'varying vec3 vSurface; uniform vec3 surfaceOrigin; uniform vec3 surfaceSpan;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvSurface = (position - surfaceOrigin) / surfaceSpan;');
      shader.fragmentShader = 'varying vec3 vSurface; uniform float filmTime; uniform float filmPhase; uniform float dotPitch;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        vec3 n = normalize(normal);
        vec3 viewDir = normalize(vViewPosition);
        float facing = abs(dot(n, viewDir));
        float rim = pow(1.0 - facing, 2.1);
        float region = 0.48 + 0.20 * sin(vSurface.y * 6.0 + vSurface.x * 3.0 + filmTime * 1.15)
          + 0.12 * cos(vSurface.z * 5.0 - vSurface.y * 3.0 - filmTime * 0.72);
        // Broad smoothstep feathering makes both spatial and scroll transitions continuous.
        float screenAmount = smoothstep(region - 0.24, region + 0.24, filmPhase);
        float warm = smoothstep(-0.15, 0.75, sin(n.x * 2.3 + n.y * 1.4 + filmTime * 1.50));
        vec3 cobalt = vec3(0.006, 0.012, 0.72);
        vec3 magenta = vec3(0.95, 0.005, 0.10);
        vec3 cyan = vec3(0.005, 0.94, 0.79);
        vec3 palette = mix(cobalt, magenta, warm * (0.02 + screenAmount * 0.98));
        // Retain physical white highlights; color is driven by normals and scroll, not time.
        outgoingLight = min(outgoingLight, vec3(2.0)) * 0.30 + palette * (0.82 + facing * 0.08);
        float edgeFlow = 0.68 + 0.32 * sin(filmTime * 2.0 + vSurface.y * 7.0 - vSurface.x * 4.0);
        vec3 edgeViolet = vec3(0.48, 0.12, 1.0);
        vec3 edgeColor = mix(cyan, edgeViolet, 0.5 + 0.5 * sin(filmTime * 1.25 + vSurface.x * 5.0));
        outgoingLight = mix(outgoingLight, edgeColor * 1.18, rim * (0.58 + edgeFlow * 0.32));
        vec2 cell = abs(fract(gl_FragCoord.xy / dotPitch) - 0.5);
        float square = max(cell.x, cell.y);
        float aa = max(fwidth(square) * 0.45, 0.025);
        float dotCoverage = 1.0 - smoothstep(0.40 - aa, 0.40 + aa, square);
        // Same neutral paper as the scene. Tiny light gaps form a dense regular matrix.
        vec3 paper = vec3(0.847, 0.896, 0.896);
        vec3 screened = mix(paper, outgoingLight, dotCoverage);
        outgoingLight = mix(outgoingLight, screened, screenAmount * (1.0 - rim * 0.85));
        #include <opaque_fragment>
      `);
    };
    material.customProgramCacheKey = () => 'clarix-screened-surface-v3-' + surfaceOpacity;
    mesh.material = material;
  }

  // Aim the two arm bones at a reachable hand target, keeping the palms apart.
  function pointBone(bone, child, target) {
    const origin = bone.getWorldPosition(new T.Vector3());
    const direction = child.getWorldPosition(new T.Vector3()).sub(origin).normalize();
    const desired = target.clone().sub(origin).normalize();
    const rotation = new T.Quaternion().setFromUnitVectors(direction, desired);
    const worldRotation = bone.getWorldQuaternion(new T.Quaternion()).premultiply(rotation);
    const parentRotation = bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
    bone.quaternion.copy(parentRotation.multiply(worldRotation));
    bone.updateWorldMatrix(false, true);
  }
  function liftHand(side, sign, amount, localTarget = null, localPole = null, localElbowBias = null) {
    const arm = bones[side + 'Arm'], elbow = bones[side + 'ForeArm'], hand = bones[side + 'Hand'];
    if (!arm || !elbow || !hand || amount < .001) return;
    const shoulder = arm.getWorldPosition(new T.Vector3());
    const currentElbow = elbow.getWorldPosition(new T.Vector3());
    const currentHand = hand.getWorldPosition(new T.Vector3());
    const upperLength = shoulder.distanceTo(currentElbow);
    const lowerLength = currentElbow.distanceTo(currentHand);
    const target = rig.localToWorld(localTarget ? localTarget.clone() : new T.Vector3(sign * .68, .85, .85));
    target.lerpVectors(currentHand, target, amount);
    const direction = target.clone().sub(shoulder);
    const distance = T.MathUtils.clamp(direction.length(), .01, upperLength + lowerLength - .001);
    direction.normalize();
    const along = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
    const bend = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
    const pole = rig.localToWorld(localPole ? localPole.clone() : new T.Vector3(sign * 1.5, .1, .35)).sub(shoulder);
    pole.addScaledVector(direction, -pole.dot(direction)).normalize();
    const elbowTarget = shoulder.clone().addScaledVector(direction, along).addScaledVector(pole, bend);
    if(localElbowBias){
      const rigOrigin=rig.localToWorld(new T.Vector3());
      const biasWorld=rig.localToWorld(localElbowBias.clone()).sub(rigOrigin);
      elbowTarget.add(biasWorld);
    }
    pointBone(arm, elbow, elbowTarget);
    pointBone(elbow, hand, target);
  }
  function animate(scroll, still, idleSeconds = 0, idleScale = 1) {
    for (const [bone, quaternion] of restPose) bone.quaternion.copy(quaternion);
    if (options.portraitPose && restingHipPosition) {
      const weight = 1 - T.MathUtils.smoothstep(scroll, 0, .55);
      bones.Hips.position.copy(restingHipPosition);
      rig.updateMatrixWorld(true);
      const hipPosition = rig.worldToLocal(bones.Hips.getWorldPosition(new T.Vector3()));
      hipPosition.x += .065 * weight;
      bones.Hips.position.copy(bones.Hips.parent.worldToLocal(rig.localToWorld(hipPosition)));
      bones.Hips.rotation.z += .025 * weight;
      if (bones.Spine) bones.Spine.rotation.z -= .045 * weight;
    }
    // Small, asymmetric spine sway keeps the feet planted. This is the only
    // pose component driven by elapsed time; the hand sequence remains scrubbed.
    if (!still) {
      if (bones.Spine) {
        bones.Spine.rotation.z += Math.sin(idleSeconds*.85)*.045*idleScale;
        bones.Spine.rotation.x += Math.sin(idleSeconds*.78+.6)*.060*idleScale;
        bones.Spine.rotation.y += Math.sin(idleSeconds*.63+1.35)*.028*idleScale;
      }

      if (bones.Head) {
        bones.Head.rotation.x += Math.sin(idleSeconds*.78+1.1)*.022*idleScale;
        bones.Head.rotation.z += Math.sin(idleSeconds*.85+2.15)*.014*idleScale;
      }
    }
    rig.updateMatrixWorld(true);
    for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
      const thigh = bones[side + 'UpLeg'];
      const foot = bones[side + 'Foot'];
      if (thigh && foot) {
        const target = rig.worldToLocal(foot.getWorldPosition(new T.Vector3()));
        target.x = sign * (options.stanceHalfWidth ?? .18);
        pointBone(thigh, foot, rig.localToWorld(target));
      }
    }
    if (options.portraitPose) {
      const weight = 1 - T.MathUtils.smoothstep(scroll, 0, .55);
      if (bones.Spine) bones.Spine.rotation.y += .15 * weight;
      if (bones.Head) bones.Head.rotation.y -= .15 * weight;
      rig.updateMatrixWorld(true);
      if (weight && bones.Spine && bones.Neck && bones.Hips) {
        // Bring the chest back over the pelvis while keeping the feet planted.
        const hip = rig.worldToLocal(bones.Hips.getWorldPosition(new T.Vector3()));
        const neck = rig.worldToLocal(bones.Neck.getWorldPosition(new T.Vector3()));
        const uprightDepth = hip.z - (neck.y - hip.y) * Math.tan(T.MathUtils.degToRad(6));
        neck.z = T.MathUtils.lerp(neck.z, uprightDepth, weight);
        pointBone(bones.Spine, bones.Neck, rig.localToWorld(neck));
      }
      for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
        const arm = bones[side + 'Arm'];
        const elbow = bones[side + 'ForeArm'];
        const hand = bones[side + 'Hand'];
        if (!arm || !elbow || !hand || !weight) continue;
        const shoulder = rig.worldToLocal(arm.getWorldPosition(new T.Vector3()));
        const wrist = rig.worldToLocal(hand.getWorldPosition(new T.Vector3()));
        const joint = rig.worldToLocal(elbow.getWorldPosition(new T.Vector3()));
        const reach = shoulder.distanceTo(joint) + joint.distanceTo(wrist);
        // The near arm hangs slightly forward; the far wrist follows the hip.
        const wristOffset = side === 'Left'
          ? new T.Vector3(.14, -.96, .15)
          : new T.Vector3(-.08, -.97, -.08);
        const target = shoulder.clone().addScaledVector(wristOffset, reach);
        const pole = shoulder.clone().add(new T.Vector3(sign * .5, -.5, -.24));
        liftHand(side, sign, weight, target, pole);
      }
    }
    if (!still) {
      const ease = value => { value = T.MathUtils.clamp(value, 0, 1); return value * value * (3 - 2 * value); };
      const leftLift = ease((scroll - .08) / .48) * (1 - ease((scroll - 1.9) / .65));
      const rightLift = ease((scroll - .85) / .5) * (1 - ease((scroll - 2.35) / .65));
      const lookLeft = ease((scroll - .23) / .34) * (1 - ease((scroll - 1.05) / .35));
      const lookRight = ease((scroll - 1.10) / .35) * (1 - ease((scroll - 2.15) / .4));
      if (bones.Head) {
        bones.Head.rotation.x += (lookLeft + lookRight) * .35;
        bones.Head.rotation.y += lookLeft * .28 - lookRight * .32;
        bones.Head.rotation.z += lookLeft * .055 - lookRight * .04;
      }
      rig.updateMatrixWorld(true);
      for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
        const lift = side === 'Left' ? leftLift : rightLift;
        liftHand(side, sign, lift);
        const hand = bones[side + 'Hand'];
        
        
        const middle = bones[side + 'HandMiddle1'];
        if (hand && middle && lift > .01) {
          const rest = hand.quaternion.clone();
          const fingerTarget = rig.localToWorld(new T.Vector3(sign * .70, 1.5, .95));
          pointBone(hand, middle, fingerTarget);
          hand.quaternion.slerpQuaternions(rest, hand.quaternion.clone(), lift);
        }
        for (const finger of ['Index', 'Middle', 'Ring', 'Pinky']) {
          for (let joint = 1; joint <= 3; joint++) {
            const bone = bones[side + 'Hand' + finger + joint];
            if (bone) bone.rotation.z += sign * lift * (.08 + .06 * Math.sin(scroll * 1.8 + joint));
          }
        }
      }
    }
    filmTime.value = still ? 0 : filmMotion ? idleSeconds*1.15 + scroll*.85 : scroll*1.7;
    rig.updateMatrixWorld(true);
    scene.updateMatrixWorld(true);
  }
  function setPhase(value) {
    filmPhase.value = T.MathUtils.clamp(value, 0, 1);
  }
  function aimPalm(side, tip, localNormal) {
    const hand=bones[side+'Hand'],middle=bones[side+'HandMiddle1'];
    const index=bones[side+'HandIndex1'],pinky=bones[side+'HandPinky1'];
    if(!hand||!middle||!index||!pinky)return;
    pointBone(hand,middle,rig.localToWorld(tip.clone()));
    const origin=hand.getWorldPosition(new T.Vector3());
    const axis=middle.getWorldPosition(new T.Vector3()).sub(origin).normalize();
    const across=index.getWorldPosition(new T.Vector3()).sub(pinky.getWorldPosition(new T.Vector3())).normalize();
    const normal=new T.Vector3().crossVectors(across,axis).normalize().multiplyScalar(side==='Left'?-1:1);
    const wanted=localNormal.clone().transformDirection(rig.matrixWorld);
    wanted.addScaledVector(axis,-wanted.dot(axis)).normalize();
    if(wanted.lengthSq()<.01)return;
    const twist=new T.Quaternion().setFromUnitVectors(normal,wanted);
    const world=hand.getWorldQuaternion(new T.Quaternion()).premultiply(twist);
    hand.quaternion.copy(hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
    hand.updateWorldMatrix(false,true);
  }
  function turnWristAroundWorldVertical(hand, degrees) {
    if(!hand||Math.abs(degrees)<.001)return;
    const world=hand.getWorldQuaternion(new T.Quaternion());
    const turn=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),T.MathUtils.degToRad(degrees));
    world.premultiply(turn);
    hand.quaternion.copy(hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
    hand.updateWorldMatrix(false,true);
  }
  function twistBoneAlongChild(bone, child, radians) {
    if(!bone||!child||Math.abs(radians)<.001)return;
    const origin=bone.getWorldPosition(new T.Vector3());
    const axis=child.getWorldPosition(new T.Vector3()).sub(origin).normalize();
    const world=bone.getWorldQuaternion(new T.Quaternion());
    world.premultiply(new T.Quaternion().setFromAxisAngle(axis,radians));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
    bone.updateWorldMatrix(false,true);
  }
  function rotateDirectionLongWay(from, to, amount) {
    const start=from.clone().normalize(),end=to.clone().normalize();
    const angle=Math.acos(T.MathUtils.clamp(start.dot(end),-1,1));
    if(angle<.0001)return start;
    const axis=new T.Vector3().crossVectors(start,end).normalize();
    // Use the negative, long arc instead of the default short arc. This makes
    // the visible palm travel forward/counterclockwise while both endpoints
    // remain byte-for-byte equivalent in orientation.
    return start.applyAxisAngle(axis,(angle-Math.PI*2)*amount).normalize();
  }
  function openPresentingFingers(side,amount) {
    const hand=bones[side+'Hand'];
    if(!hand||amount<.001)return;
    const mirror=side==='Left'?1:-1;
    const spread={Thumb1:-.18,Index1:.12,Middle1:.035,Ring1:-.075,Pinky1:-.17};
    for(const [finger,value] of Object.entries(spread)){
      const base=bones[side+'Hand'+finger];
      if(base)base.rotation.y+=value*amount*mirror;
    }
    for(const finger of ['Index','Middle','Ring','Pinky']){
      for(let joint=1;joint<=3;joint++){
        const bone=bones[side+'Hand'+finger+joint];
        if(bone)bone.rotation.z+=(side==='Left'?-1:1)*.055*amount;
      }
    }
    hand.updateWorldMatrix(false,true);
  }
  function animateAbout(progress, still, seconds) {
    animate(0,still,seconds);
    const t=T.MathUtils.smoothstep(progress,0,1);
    rig.updateMatrixWorld(true);
    // Screen-left is raised in the low-angle opening while screen-right rests at
    // the hip. The roles exchange smoothly into the existing high-angle pose.
    const right=new T.Vector3(-1.12,.78,.49).lerp(new T.Vector3(-.57,.40,.24),t);
    const left=new T.Vector3(.57,.40,.24).lerp(new T.Vector3(1.12,.78,.49),t);
    // Opening pose: let the raised screen-left elbow breathe slightly farther
    // outward, while the screen-right hip elbow tucks a touch left and back.
    const rightPole=new T.Vector3(-1.04,.18,.34).lerp(new T.Vector3(-1.05,.35,.15),t);
    const leftPole=new T.Vector3(.95,.35,.08).lerp(new T.Vector3(.94,.18,.34),t);
    const opening=1-t;
    const rightElbowBias=new T.Vector3(-.14,0,0).multiplyScalar(opening);
    const leftElbowBias=new T.Vector3(-.11,0,-.11).multiplyScalar(opening);
    liftHand('Right',-1,1,right,rightPole,rightElbowBias);
    liftHand('Left',1,1,left,leftPole,leftElbowBias);
    const rightTip=right.clone().add(new T.Vector3(-.34,.02,0).lerp(new T.Vector3(.02,-.16,.02),t));
    const leftTip=left.clone().add(new T.Vector3(-.02,-.16,.02).lerp(new T.Vector3(.34,.02,0),t));
    // Rotate both palms forward/counterclockwise during the transition while
    // preserving the exact low- and high-angle endpoint poses.
    twistBoneAlongChild(bones.RightForeArm,bones.RightHand,-Math.PI*(1-t));
    twistBoneAlongChild(bones.LeftForeArm,bones.LeftHand,Math.PI*t);
    const rightPalm=rotateDirectionLongWay(new T.Vector3(0,1,0),new T.Vector3(1,0,-.2),t);
    const leftPalm=rotateDirectionLongWay(new T.Vector3(-1,0,-.2),new T.Vector3(0,1,0),t);
    aimPalm('Right',rightTip,rightPalm);
    aimPalm('Left',leftTip,leftPalm);
    turnWristAroundWorldVertical(bones.RightHand,30*(1-t));
    turnWristAroundWorldVertical(bones.LeftHand,-30*t);
    const openingPalmIdle=still?0:1-t;
    if(openingPalmIdle>.001){
      // The raised screen-left palm has a slightly wider conversational sway;
      // the screen-right hip palm follows with a quieter, offset motion.
      turnWristAroundWorldVertical(
        bones.RightHand,
        Math.sin(seconds*1.28+.25)*4.2*openingPalmIdle
      );
      turnWristAroundWorldVertical(
        bones.LeftHand,
        Math.sin(seconds*1.03+1.55)*2.4*openingPalmIdle
      );
    }
    openPresentingFingers('Right',1-t);
    openPresentingFingers('Left',t);
    rig.updateMatrixWorld(true);
  }
  const aboutEndpoint = Object.entries(bones).map(([name,bone]) => ({
    name, bone, rotation:new T.Quaternion(), position:new T.Vector3()
  }));
  function animateAboutTransition(progress, still, seconds) {
    // Sample the final pose, then interpolate directly from the Work opening.
    // Quaternion slerp takes the short rotation path at each joint.
    animateAbout(1, still, seconds);
    for (const pose of aboutEndpoint) {
      pose.rotation.copy(pose.bone.quaternion);
      pose.position.copy(pose.bone.position);
    }
    animate(0, still, seconds, .38);
    for (const pose of aboutEndpoint) {
      const wrist = /Hand/.test(pose.name);
      const arm = /Arm|Shoulder/.test(pose.name);
      const amount = T.MathUtils.smoothstep(progress,
        wrist ? .16 : arm ? .06 : 0,
        wrist ? .94 : arm ? .85 : 1);
      pose.bone.quaternion.slerp(pose.rotation, amount);
      pose.bone.position.lerp(pose.position, amount);
    }
    rig.updateMatrixWorld(true);
  }
  function introduce(amount, still, seconds) {
    if(amount<=0)return;
    const before=new Map(Object.values(bones).map(b=>[b,b.quaternion.clone()]));
    animateAbout(1,still,seconds);
    for(const [bone,previous] of before)bone.quaternion.slerpQuaternions(previous,bone.quaternion.clone(),amount);
    rig.updateMatrixWorld(true);
  }
  function applyLimbTuning(tuning, amount=1) {
    for (const side of ['Right','Left']) {
      for (const [part, boneName] of [['wrist', side+'ForeArm'], ['palm', side+'Hand']]) {
        const bone = bones[boneName];
        const values = tuning?.[side]?.[part];
        if (!bone || !values) continue;
        const position = values.position || {};
        const rotation = values.rotation || {};
        const rest = restPosition.get(bone);
        if (rest) bone.position.copy(rest).add(new T.Vector3(
          (Number(position.x) || 0) * amount,
          (Number(position.y) || 0) * amount,
          (Number(position.z) || 0) * amount
        ));
        bone.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(
          T.MathUtils.degToRad((Number(rotation.x) || 0) * amount),
          T.MathUtils.degToRad((Number(rotation.y) || 0) * amount),
          T.MathUtils.degToRad((Number(rotation.z) || 0) * amount),
          'XYZ'
        )));
        bone.updateWorldMatrix(false, true);
      }
    }
  }
  return { rig, setPhase, animate, animateAbout, animateAboutTransition, introduce, applyLimbTuning };
}
