// The resting field and cursor waves share one regular lattice. Work can opt
// into a slow autonomous field while the shared content pages stay static.
export function mountRipples(stage, reduce, options={}) {
  const ambient=options.ambient===true;
  const canvas = document.createElement('canvas');
  canvas.className = 'ripple-field';
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);
  const context = canvas.getContext('2d');
  if (!context) return;
  const blue = [68, 77, 207], pink = [227, 75, 136], cyan = [49, 178, 199];
  const mix = (a,b,t) => a.map((value,index) => value+(b[index]-value)*t);
  const palette = Array.from({length:32},(_,index) =>
    'rgb(' + mix(blue,pink,index/31).map(Math.round).join(',') + ')');
  let points = [], waves = [], frame = 0, lastAmbientDraw = 0;
  let lastTrigger = -1000, lastX = -1000, lastY = -1000;
  const lifetime = 1700;
  function resize() {
    const ratio = 1;
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    context.setTransform(ratio,0,0,ratio,0,0);
    const patches = [
      {x:.67,y:.24,r:.42,warm:.8},
      {x:.25,y:.68,r:.34,warm:.12},
      {x:.79,y:.79,r:.38,warm:.65}
    ];
    points = [];
    const step = innerWidth < 680 ? 9 : 12;
    const unit = Math.min(innerWidth,innerHeight*1.3);
    for (let y=0;y<innerHeight;y+=step) {
      for (let x=0;x<innerWidth;x+=step) {
        let strength=0,warm=0;
        for (const patch of patches) {
          const d2=((x-innerWidth*patch.x)**2+(y-innerHeight*patch.y)**2)/(unit*patch.r)**2;
          const weight=Math.exp(-d2*2.2);
          if(weight>strength){strength=weight;warm=patch.warm;}
        }
        points.push({x,y,strength,warm});
      }
    }
    wake();
  }
  function wake(){if(!frame)frame=requestAnimationFrame(draw);}
  function draw(now) {
    frame=0;
    if(ambient&&!waves.length&&!reduce.matches&&now-lastAmbientDraw<32){wake();return;}
    lastAmbientDraw=now;
    context.clearRect(0,0,innerWidth,innerHeight);
    waves=waves.filter(wave=>now-wave.time<lifetime&&!reduce.matches);
    const active=waves.map(wave=>{
      const progress=(now-wave.time)/lifetime;
      const fade=Math.min(1,progress*12)*(1-progress)**2;
      return {...wave,fade};
    });
    const seconds=now*.001;
    const span=Math.hypot(innerWidth,innerHeight)*.82;
    const ambientWaves=ambient&&!reduce.matches?[
      {x:innerWidth*(.72+.06*Math.sin(seconds*.13)),y:innerHeight*(.34+.05*Math.cos(seconds*.11)),radius:30+(seconds*30)%(span+180),strength:.34},
      {x:innerWidth*(.24+.05*Math.cos(seconds*.10)),y:innerHeight*(.72+.06*Math.sin(seconds*.12)),radius:30+(seconds*24+span*.48)%(span+180),strength:.27}
    ]:[];
    let maskSwitch=.5+.5*Math.sin(seconds*.36);
    maskSwitch=maskSwitch*maskSwitch*(3-2*maskSwitch);
    const maskAngle=seconds*.10+.28*Math.sin(seconds*.17);
    const maskCos=Math.cos(maskAngle),maskSin=Math.sin(maskAngle);
    // The reference texture reads as one large field behind the type and robot,
    // rather than as several small islands. It still breathes, but never collapses.
    const maskStretchX=.44+.24*(.5+.5*Math.sin(seconds*.21));
    const maskStretchY=.36+.25*(.5+.5*Math.cos(seconds*.17+1.1));
    const bandAngle=-seconds*.075+.35*Math.cos(seconds*.13);
    const bandCos=Math.cos(bandAngle),bandSin=Math.sin(bandAngle);
    const bandWidth=.10+.18*(.5+.5*Math.sin(seconds*.24+1.4));
    const maskRadius = Math.max(92, Math.min(innerWidth, innerHeight) * .24);
    for(const point of points){
      let dx=0,dy=0,power=0,warm=point.warm,fieldStrength=point.strength;
      if(ambient&&!reduce.matches){
        const nx=point.x/innerWidth-(.54+.12*Math.sin(seconds*.09));
        const ny=point.y/innerHeight-(.50+.10*Math.cos(seconds*.11));
        const mx=nx*maskCos-ny*maskSin,my=nx*maskSin+ny*maskCos;
        const ellipseMask=Math.exp(-(mx*mx/(maskStretchX*maskStretchX)+my*my/(maskStretchY*maskStretchY))*1.35);
        const bx=nx*bandCos-ny*bandSin,by=nx*bandSin+ny*bandCos;
        const bandCenter=.10*Math.sin(bx*10-seconds*.58);
        const bandMask=Math.exp(-Math.pow((by-bandCenter)/bandWidth,2))*(.72+.28*Math.sin(bx*8+seconds*.42));
        const fullScreenMask=Math.max(0,ellipseMask*(1-maskSwitch)+Math.max(0,bandMask)*maskSwitch);
        fieldStrength=Math.max(point.strength*.22,fullScreenMask*.94);
        const drift=.5+.5*Math.sin(point.x*.008-point.y*.006+seconds*.48);
        dx+=Math.sin(seconds*.34+point.y*.010)*2.5*fieldStrength;
        dy+=Math.cos(seconds*.29+point.x*.009)*2.1*fieldStrength;
        power=fieldStrength*(.08+.13*drift);
        warm=.5+.5*Math.sin(seconds*.30+point.x/innerWidth*2.6-point.y/innerHeight*1.4);
        for(const wave of ambientWaves){
          const vx=point.x-wave.x,vy=point.y-wave.y;
          const distance=Math.hypot(vx,vy)||1;
          const gap=distance-wave.radius;
          if(Math.abs(gap)>125)continue;
          const envelope=Math.exp(-Math.pow(gap/58,2))*wave.strength;
          const displacement=Math.sin(gap/30)*9*envelope;
          dx+=vx/distance*displacement;dy+=vy/distance*displacement;
          if(envelope>power){power=envelope;warm=.5+.5*Math.sin(gap/64+seconds*.22);}
        }
      }
      for(const wave of active){
        const vx=point.x-wave.x,vy=point.y-wave.y;
        const radialDistance=Math.hypot(vx,vy)/maskRadius;
        if(radialDistance>=1)continue;
        const reveal=(1-radialDistance*radialDistance*(3-2*radialDistance))*wave.fade;
        fieldStrength+=reveal*(1-fieldStrength);
      }
      const opacity=Math.min(.66,fieldStrength*.36+power*.50);
      if(opacity<.008)continue;
      const size=.62+fieldStrength*4.8+power*1.9;
      context.fillStyle=palette[Math.max(0,Math.min(31,Math.round(warm*31)))];
      context.globalAlpha=opacity;
      context.fillRect(point.x+dx-size/2,point.y+dy-size/2,size,size);
    }
    context.globalAlpha=1;
    if(waves.length||(ambient&&!reduce.matches))wake();
  }
  function pulse(event){
    if(reduce.matches||event.pointerType==='touch')return;
    const now=performance.now();
    if(now-lastTrigger<550||Math.hypot(event.clientX-lastX,event.clientY-lastY)<34)return;
    lastTrigger=now;lastX=event.clientX;lastY=event.clientY;
    waves.push({x:lastX,y:lastY,time:now});
    waves=waves.slice(-5);
    wake();
  }
  window.addEventListener('pointermove',pulse,{passive:true});
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){waves=[];cancelAnimationFrame(frame);frame=0;}else wake();});
  reduce.addEventListener('change',()=>{waves=[];wake();});
  resize();
}
