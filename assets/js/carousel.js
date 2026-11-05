import { works } from './work-data.js?v=depth-1';

const selected = works.slice(0, 5);
const region = document.querySelector('.selected');
const rail = region.querySelector('.rail');
const stage = rail.querySelector('.reel-stage');
const title = document.querySelector('#projectLink');
const counter = document.querySelector('#count');
let position = 0;
let drag = null;
let dragged = false;
let snapTimer;
let blur = 0;
// Public Preview / Customize proportions. Autoplay stays off for this site.
const settings = {aspect:1.45, size:.47, curvature:.64, distance:2.9, tilt:0, gap:23, dim:.58, motionBlur:.85, speed:.05};
const ready = () => region.dataset.reelReady !== 'false';

const cards = selected.map(work => {
  const link = document.createElement('a');
  link.className = 'reel-card';
  link.href = 'pages/projects/' + work.id + '.html';
  const image = document.createElement('img');
  image.src = 'assets/images/' + work.id + '.svg';
  image.alt = work.title + ' — conceptual cover';
  link.append(image);
  stage.append(link);
  return link;
});

function draw() {
  const length = selected.length;
  const active = ((Math.round(position) % length) + length) % length;
  const narrow = innerWidth < 680;
  const cardWidth = Math.min(rail.clientWidth * (narrow ? .66 : .35), rail.clientHeight * .88 * settings.aspect);
  const cardHeight = cardWidth / settings.aspect;
  region.style.setProperty('--card-height', cardHeight + 'px');
  // Curvature is a normalized control, not radians. This angle leaves both
  // outer cards visible at the edge of a five-card ring.
  const angleStep = settings.curvature * .78;
  const radius = (cardWidth + settings.gap) / (2 * Math.sin(angleStep / 2));
  rail.style.perspective = cardWidth * settings.distance + 'px';
  stage.style.transform = 'rotateX(' + -settings.tilt + 'deg)';
  cards.forEach((card, index) => {
    let delta = ((index - position) % length + length) % length;
    if (delta > length / 2) delta -= length;
    const angle = delta * angleStep;
    const offset = Math.sin(angle) * radius;
    const depth = (Math.cos(angle) - 1) * radius;
    card.style.width = cardWidth + 'px';
    card.style.transform = 'translate(-50%, -50%) translateX(' + offset + 'px) translateZ(' + depth + 'px) rotateY(' + (angle * 180 / Math.PI) + 'deg)';
    card.style.filter = 'brightness(' + (1 - settings.dim * Math.min(1, Math.abs(delta) / 2)) + ') blur(' + blur + 'px)';
    card.style.opacity = Math.min(1, Math.max(0, (2.5-Math.abs(delta))/.22));
    card.style.zIndex = String(10 - Math.round(Math.abs(delta) * 5));
    card.tabIndex = index === active ? 0 : -1;
    card.setAttribute('aria-current', index === active ? 'true' : 'false');
  });
  const work = selected[active];
  title.textContent = work.title;
  title.href = 'pages/projects/' + work.id + '.html';
  counter.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(length).padStart(2, '0') + ' · ' + work.category;
}

function snap() {
  if (!ready()) return;
  rail.classList.add('is-stepping');
  position = Math.round(position);
  blur = 0;
  draw();
}
function step(direction) {
  if (!ready()) return;
  clearTimeout(snapTimer);
  position = Math.round(position) + direction;
  snap();
}
rail.addEventListener('wheel', event => {
  // Consume wheel input only inside the reel while retaining browser zoom.
  if (!ready() || event.ctrlKey) return;
  event.preventDefault();
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rail.clientHeight : 1;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  clearTimeout(snapTimer);
  rail.classList.remove('is-stepping');
  const travel = Math.max(-240, Math.min(240, delta * unit));
  position += travel * settings.speed / 24;
  blur = Math.min(2, Math.abs(travel) / 90) * settings.motionBlur;
  draw();
  snapTimer = setTimeout(snap, 180);
}, {passive:false});

document.querySelector('#prev').onclick = () => step(-1);
document.querySelector('#next').onclick = () => step(1);
rail.addEventListener('keydown', event => {
  if (!ready() || !['ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Escape') {
    document.querySelector('.reel-hint').tabIndex = -1;
    document.querySelector('.reel-hint').focus();
    return;
  }
  step(event.key === 'ArrowRight' ? 1 : -1);
});
rail.addEventListener('dragstart', event => event.preventDefault());
rail.addEventListener('pointerdown', event => {
  if (!ready() || event.button !== 0) return;
  dragged = false;
  clearTimeout(snapTimer);
  rail.classList.remove('is-stepping');
  drag = {x:event.clientX, y:event.clientY, position, id:event.pointerId};
});
rail.addEventListener('pointermove', event => {
  if (!ready() || !drag || event.pointerId !== drag.id) return;
  const delta = event.clientX - drag.x;
  if (Math.abs(event.clientY - drag.y) > Math.abs(delta) && !dragged) {drag = null; return;}
  if (Math.abs(delta) < 8 && !dragged) return;
  dragged = true;
  rail.setPointerCapture(event.pointerId);
  position = drag.position - delta / Math.max(200, rail.clientWidth * .4);
  draw();
});
rail.addEventListener('pointerup', () => {if (dragged) snap(); drag = null;});
rail.addEventListener('pointercancel', () => {drag = null; snap();});
rail.addEventListener('click', event => {
  if (!ready() || dragged) {event.preventDefault(); dragged = false;}
}, true);
new MutationObserver(() => {
  if (!ready()) {
    clearTimeout(snapTimer);
    if (drag && rail.hasPointerCapture(drag.id)) rail.releasePointerCapture(drag.id);
    drag = null;
    blur = 0;
    position = Math.round(position);
    draw();
  }
}).observe(region, {attributes:true, attributeFilter:['data-reel-ready']});
new ResizeObserver(draw).observe(rail);
draw();
