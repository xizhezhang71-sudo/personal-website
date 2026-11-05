import * as T from '../vendor/three.module.min.js';
import { loadRobot } from './robot.js?v=arms-restored-27';

import { updateManifesto, STORY } from './manifesto.js?v=sync-32';
import { mountRipples } from './ripples.js?v=performance-22';

const section = document.querySelector('.signal-run');
const hero = section.querySelector('.hero');
const intro = hero.querySelector('.heroCopy');
const stage = document.querySelector('#stage');
const selected = document.querySelector('.selected');
const footer = document.querySelector('footer');
const archive = document.querySelector('.all-work');
const reduce = matchMedia('(prefers-reduced-motion:reduce)');
const clamp = value => Math.min(1, Math.max(0, value));
const ease = value => { value = clamp(value); return value * value * (3 - 2 * value); };
const WORK_START = STORY.workStart;
const WORK_DURATION = 1.10;
const WORK_END = WORK_START + WORK_DURATION;
const WORD_START = .15;
const WORD_DURATION = (STORY.exitEnd - WORD_START) / 3;
const WORD_CUES = Array.from({length:3}, (_, index) => ({
  start:WORD_START + index * WORD_DURATION,
  duration:WORD_DURATION
}));
const mix = (a,b,t) => a + (b-a)*t;


function createWord(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.font = '300 158px "Segoe UI", Arial, sans-serif';
  context.fillStyle = '#161c30';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 768, 128);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return new T.Sprite(new T.SpriteMaterial({map:texture, transparent:true, depthWrite:false, depthTest:true}));
}

async function start() {
  const renderer = new T.WebGLRenderer({antialias:true, alpha:true});
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(35, 1, .1, 80);
  const robot = await loadRobot({surfaceOpacity:.70,filmMotion:true,stanceHalfWidth:.52,portraitPose:true});
  scene.add(robot.rig);
  scene.add(new T.HemisphereLight(0xd8faff, 0x3833b0, .85));
  for (const [color, strength, x, y, z] of [
    [0xffffff, 2.1, -3, 6, 5],
    [0x00ffee, 3.6, -4, 3, -2],
    [0xff328a, 1.25, 4, 1, 2]
  ]) {
    const light = new T.DirectionalLight(color, strength);
    light.position.set(x, y, z);
    scene.add(light);
  }
  const words = ['INTO PLAY', 'TECHNOLOGY', 'CREATIVITY'].map(createWord);
  words.forEach(word => scene.add(word));
  stage.append(renderer.domElement);
  mountRipples(stage, reduce, {ambient:true});
  hero.classList.add('ready');
  document.body.classList.add('choreography-ready');
  section.append(selected);
  selected.classList.add('scroll-panel');
  const panel = selected.querySelector('.work-reveal');
  const tail = document.createElement('div');
  tail.className = 'work-scroll-tail';
  section.after(tail);
  new ResizeObserver(() => {
    tail.style.height = Math.max(0, panel.offsetHeight + 140 - innerHeight) + 'px';
  }).observe(panel);

  let frame = 0;
  let layoutDirty = true;
  function wake() {
    layoutDirty = true;
    if (!frame) frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (document.hidden) return;
    const still = reduce.matches;
    const height = innerHeight;
    const scroll = Math.max(0, -section.getBoundingClientRect().top / height);
    const narrow = innerWidth < 680;
    // Opening: a clearly low camera frames the upper thighs through the head.
    // TECHNOLOGY begins only once the camera has reached the upper-body close-up.
    // Reference opening: a close, clearly low-angle frame cropped at the upper thighs.
    const openingDistance = narrow ? 4.72 : 3.76;
    const closeDistance = narrow ? 4.8 : 3.55;
    const openingTarget = .98;
    const openingCameraDrop = openingDistance * Math.tan(T.MathUtils.degToRad(26));
    const closeTarget = 1.65;
    const framingOffset = narrow ? .084 : .24;
    const initialAngle = -T.MathUtils.degToRad(30);
    const center = still ? 0 : ease(scroll / 1.65);
    const push = still ? 0 : ease((scroll - .10) / .45);
    const exit = still ? 0 : .28*ease((scroll-1.65)/(.75)) + .72*ease((scroll-STORY.leaveStart)/STORY.leaveDuration);
    const archiveStart = archive.getBoundingClientRect().top + scrollY - height * .72;
    const pageEnd = Math.max(archiveStart + 1, document.documentElement.scrollHeight - height);
    const returning = scrollY >= archiveStart;
    const returnProgress = clamp((scrollY - archiveStart) / (pageEnd - archiveStart));
    const enter = ease(returnProgress / .28);
    const home = ease((returnProgress - .28) / .72);
    const closeup = returning ? (still ? 0 : 1-home) : push;
    const fov = mix(narrow ? 41 : 43.5, 35, closeup);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const distance = mix(openingDistance, closeDistance, closeup);
    const target = mix(openingTarget, closeTarget, closeup);
    const cameraDrop = mix(openingCameraDrop,.30,closeup);
    const halfWidth = distance * Math.tan(T.MathUtils.degToRad(camera.fov/2)) * camera.aspect;
    const openingX = distance * camera.aspect * framingOffset;
    const technology = ease((scroll-.95)/.70);
    let modelX = (1-center) * openingX - exit * (halfWidth + .90);
    const firstTurn = ease((scroll-1.65)/(STORY.leaveStart-1.65));
    const leaving = ease((scroll-STORY.leaveStart)/STORY.leaveDuration);
    const frontAngle = Math.PI*2;
    let modelAngle = scroll < 1.65
      ? mix(initialAngle, .65, center) + technology*.85
      : mix(1.5, frontAngle, firstTurn) + leaving*Math.PI*2;
    let poseScroll = scroll < 1.65 ? scroll : mix(1.65,3.0,leaving);
    if (returning) {
      // Re-enter from the left in close-up, then travel right and pull back.
      const leftX = -halfWidth * (narrow ? .40 : .60);
      modelX = still ? openingX : mix(mix(-halfWidth-1.35,leftX,enter),openingX,home);
      modelAngle = still ? initialAngle : initialAngle + Math.PI*2 + (1-home)*(-.85+enter*.35);
      poseScroll = still ? 0 : mix(1.55,0,home);
    }
    robot.rig.position.set(modelX,0,0);
    robot.rig.rotation.y = modelAngle;
    // Keep the subject on the optical centreline. Shift the captured frame
    // to place it on screen without the sideways convergence of an off-axis body.
    camera.position.set(modelX, target - cameraDrop, distance);
    camera.lookAt(modelX, target, 0);
    const frameWidth = stage.clientWidth;
    const frameHeight = stage.clientHeight;
    const projectedHalfWidth = Math.hypot(distance, cameraDrop)
      * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const viewOffsetX = -modelX / (2 * projectedHalfWidth) * frameWidth;
    if (!camera.view || camera.view.offsetX !== viewOffsetX
        || camera.view.fullWidth !== frameWidth || camera.view.fullHeight !== frameHeight) {
      camera.setViewOffset(frameWidth, frameHeight, viewOffsetX, 0, frameWidth, frameHeight);
    }
    const materialScroll = returning ? mix(2.0,0,home) : scroll;
    robot.setPhase(still ? 0 : .48 + .18*Math.sin(materialScroll*3.6) + .17*Math.sin(now*.00155));
    robot.animate(poseScroll, still, now*.001, .38);
    const sceneVisible = returning || scroll < STORY.exitEnd;
    robot.rig.visible = sceneVisible;

    words.forEach((word, index) => {
      const {start, duration} = WORD_CUES[index];
      let progress = (scroll - start) / duration;
      const visible = !still && !returning && progress > 0 && progress < 1;
      word.visible = visible;
      if (!visible) return;
      // The orbit starts with the fade, travels once clockwise, and follows the rig.
      // Cross the front at mid-orbit, after the entrance fade is complete.
      const angle = Math.PI + clamp(progress) * Math.PI * 2;
      const framing = 1-closeup*.43;
      const width = (narrow ? 1.7 : 2.8)*framing;
      // Keep the whole billboard outside an inflated torso/arm envelope.
      // Do not clamp its center toward the robot to fit the viewport.
      const bodyRadius = .66;
      const clearance = .10;
      const radius = bodyRadius + width*.5 + clearance;
      const center = new T.Vector3(0,.8+closeup*.75,0);
      robot.rig.updateWorldMatrix(true,false);
      robot.rig.localToWorld(center);
      word.position.set(center.x+Math.sin(angle)*radius,
        center.y+Math.sin(angle)*.12, center.z+Math.cos(angle)*radius);
      // A complete word stays in front or behind the surface with depth testing.
      word.renderOrder = 0;
      word.scale.set(width,width/6,1);
      const fadeStart = .78;
      const frontness = (1 + Math.cos(angle)) / 2;
      const depthOpacity = .18 + .82 * ease(frontness);
      word.material.opacity = depthOpacity * ease(progress/.28)
        * (1-ease((progress-fadeStart)/(1-fadeStart)));

    });
    renderer.render(scene, camera);
    stage.classList.add('live');
    renderer.domElement.style.opacity = sceneVisible ? 1 : 0;
    const introOpacity = still ? 1 : 1 - ease(scroll / .34);
    intro.style.opacity = introOpacity;
    intro.inert = introOpacity < .1;
    hero.querySelector('.sceneNote').style.opacity = returning ? 0 : 1-exit;
    if (layoutDirty) {
      layoutDirty = false;
      const progress = still ? 1 : clamp((scroll - WORK_START) / WORK_DURATION);
      const reveal = ease(progress);
      updateManifesto(scroll, still);
      selected.style.setProperty('--slide', '0px');
      const departure = still ? 0 : ease(-selected.getBoundingClientRect().top / (height*.8));
      selected.style.setProperty('--grow', (.6 + reveal * .4)*(1-.3*departure));
      selected.style.setProperty('--rise', (1-reveal) * height * .78 + 'px');
      selected.style.setProperty('--reveal', progress*(1-departure));
      // A single gate protects wheel, drag, buttons and links during the entrance.
      const docked = still || (progress >= .999 && Math.abs(selected.getBoundingClientRect().top) < 2);
      selected.dataset.reelReady = String(docked);
      panel.inert = !docked;
      selected.querySelector('.rail').setAttribute('aria-disabled', String(!docked));
      const footerProgress = still ? 1 : ease((height - footer.getBoundingClientRect().top) / 140);
      footer.style.setProperty('--footer-opacity', footerProgress);
      footer.style.setProperty('--footer-rise', (1 - footerProgress) * 55 + 'px');
      footer.style.setProperty('--footer-scale', .88 + .12 * footerProgress);
      const archiveRect=archive.getBoundingClientRect();
      const archiveIn=still?1:ease((height-archiveRect.top)/(height*.75));
      const archiveOut=still?0:ease((height*.65-archiveRect.bottom)/(height*.65));
      archive.style.setProperty('--archive-opacity',archiveIn*(1-archiveOut));
      archive.style.setProperty('--archive-scale',.82+.18*archiveIn-.15*archiveOut);
      document.querySelectorAll('.archive-card, .archive-heading').forEach(card => {
        const progress = still ? 1 : ease((height - card.getBoundingClientRect().top) / (height * .65));
        card.style.setProperty('--card-opacity', progress);
        card.style.setProperty('--card-rise', (1-progress) * 90 + 'px');
      });
    }
    // The idle loop runs only where the robot is visible, including its return.
    if (!still && sceneVisible) frame = requestAnimationFrame(draw);
  }
  function resize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.15));
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    wake();
  }
  window.addEventListener('scroll', wake, {passive:true});
  document.addEventListener('visibilitychange', wake);
  reduce.addEventListener('change', resize);
  new ResizeObserver(resize).observe(stage);
  function openSelected(event) {
    if (reduce.matches) return;
    event?.preventDefault();
    const top = section.getBoundingClientRect().top + scrollY + innerHeight * (WORK_START + WORK_DURATION);
    window.scrollTo({top:Math.ceil(top)+1, behavior:'instant'});
  }
  document.querySelectorAll('a[href="#selected"]').forEach(link => link.addEventListener('click', openSelected));
  resize();
  if (location.hash === '#selected') openSelected();
}
start().catch(error => {
  selected.dataset.reelReady = 'true';
  selected.querySelector('.work-reveal').inert = false;
  console.warn('Static scene:', error);
});
