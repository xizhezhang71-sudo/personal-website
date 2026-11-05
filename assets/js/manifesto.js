// Shared scroll coordinates, measured in viewport heights from .signal-run.
export const STORY = Object.freeze({textStart:2.05, textDuration:.35, holdAt:4.50, leaveStart:4.50, leaveDuration:1.20, exitEnd:5.70, workStart:5.10});
const panel = document.querySelector('.manifesto');
const clamp = x => Math.max(0,Math.min(1,x));
const smooth = x => {x=clamp(x);return x*x*(3-2*x);};
export function updateManifesto(scroll, reduced) {
  if (!panel) return;
  if (reduced) {panel.removeAttribute('style');panel.removeAttribute('aria-hidden');return;}
  const enter = smooth((scroll-STORY.textStart)/STORY.textDuration);
  const leave = smooth((scroll-STORY.leaveStart)/STORY.leaveDuration);
  const opacity = enter*(1-leave);
  panel.style.opacity = opacity;
  panel.style.visibility = opacity > .001 ? 'visible' : 'hidden';
  panel.style.transform = `translate3d(${(1-enter)*55}vw,${-leave*65}vh,0)`;
  panel.setAttribute('aria-hidden',String(opacity < .05));
}
