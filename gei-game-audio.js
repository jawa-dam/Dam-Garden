/* GEI GAME AUDIO ENGINE v3 — mission-safe Web Audio bootstrap */
(function(){
'use strict';

var AC = window.AudioContext || window.webkitAudioContext;
var ctx = null, master = null, comp = null, wet = null, unlocked = false;

function init(){
  if(!AC) return null;
  if(!ctx){
    ctx = new AC();
    master = ctx.createGain();
    comp = ctx.createDynamicsCompressor();
    wet = ctx.createGain();

    master.gain.value = 0.52;

    comp.threshold.value = -10;
    comp.knee.value = 14;
    comp.ratio.value = 4.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;

    wet.gain.value = 0.11;

    master.connect(comp);
    comp.connect(ctx.destination);

    /* lightweight impulse response */
    var ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
    for(var c=0;c<2;c++){
      var a=ir.getChannelData(c);
      for(var i=0;i<a.length;i++){
        a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3.2);
      }
    }

    var cv=ctx.createConvolver();
    var sg=ctx.createGain();
    cv.buffer=ir;
    sg.gain.value=0.12;
    master.connect(sg).connect(cv).connect(wet).connect(comp);
  }

  if(ctx.state === 'suspended'){
    try{
      var r=ctx.resume();
      if(r && typeof r.catch==='function') r.catch(function(){});
    }catch(e){}
  }

  return ctx;
}

function unlock(){
  var c=init();
  if(!c) return false;
  unlocked=true;
  try{
    if(c.state==='suspended'){
      var r=c.resume();
      if(r && typeof r.catch==='function') r.catch(function(){});
    }
  }catch(e){}
  return c.state !== 'suspended';
}

function jit(f){ return f * (0.975 + Math.random()*0.05); }

function osc(f0,f1,d,typ,gain,delay,cut){
  var c=init();
  if(!c) return;

  var t=c.currentTime+(delay||0);
  var o=c.createOscillator();
  var g=c.createGain();
  var lp=c.createBiquadFilter();

  o.type=typ;
  o.frequency.setValueAtTime(jit(f0),t);
  o.frequency.exponentialRampToValueAtTime(Math.max(35,f1),t+d*0.82);

  lp.type='lowpass';
  lp.frequency.setValueAtTime(cut||4200,t);
  lp.frequency.exponentialRampToValueAtTime(
    Math.max(650,(cut||4200)*0.55),t+d
  );

  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(gain,t+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001,t+d);

  o.connect(lp).connect(g).connect(master);
  o.start(t);
  o.stop(t+d+0.03);
}

function hiss(d,gain,delay){
  var c=init();
  if(!c) return;

  var n=c.createBufferSource();
  var b=c.createBuffer(1,Math.max(1,Math.floor(c.sampleRate*d)),c.sampleRate);
  var a=b.getChannelData(0);

  for(var i=0;i<a.length;i++){
    a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,2);
  }

  n.buffer=b;

  var lp=c.createBiquadFilter();
  var g=c.createGain();
  var t=c.currentTime+(delay||0);

  lp.type='lowpass';
  lp.frequency.value=3800;

  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(gain,t+0.004);
  g.gain.exponentialRampToValueAtTime(0.0001,t+d);

  n.connect(lp).connect(g).connect(master);
  n.start(t);
  n.stop(t+d+0.02);
}

function sound(k){
  init();

  if(k==='click'){
    osc(520,740,.10,'triangle',.052,0,3600);
    osc(740,960,.075,'sine',.026,.016,4300);
    hiss(.025,.012,0);

  }else if(k==='correct'||k==='good'){
    osc(440,650,.14,'triangle',.075,0,3600);
    osc(650,980,.17,'sine',.052,.045,4400);
    osc(1300,1580,.12,'triangle',.028,.105,5100);
    hiss(.04,.014,.03);

  }else if(k==='wrong'){
    osc(290,120,.25,'sine',.065,0,1500);
    osc(190,85,.28,'triangle',.042,.015,1000);
    hiss(.05,.01,0);

  }else if(k==='save'){
    osc(500,720,.12,'triangle',.055,0,3600);
    osc(720,1040,.15,'sine',.042,.05,4400);
    hiss(.03,.01,.02);

  }else if(k==='level'||k==='level-complete'){
    [523,659,784,988,1175].forEach(function(f,i){
      osc(f,f*1.02,.20,'triangle',.06,i*.085,4400);
      osc(f/2,f/2*1.01,.18,'sine',.022,i*.085,2500);
    });
    osc(1568,1760,.28,'sine',.055,.47,5600);
    hiss(.10,.022,.40);

  }else if(k==='certificate'||k==='vault'||k==='fanfare'){
    [392,523,659,784,988,1175,1568].forEach(function(f,i){
      osc(f,f*1.025,.20,'triangle',.065,i*.095,4800);
      if(i>2) osc(f*2,f*2.01,.12,'sine',.018,i*.095+.035,5700);
    });
    osc(2093,2217,.34,'sine',.06,.72,6000);
    hiss(.14,.04,.60);
  }
}

window.GEI_AUDIO_UNLOCK = unlock;
window.sound = sound;
window.GEI_GAME_SOUND = sound;


/* GEI AUDIO BOOTSTRAP v2
   Explicitly unlock/resume Web Audio during the first user gesture. */
(function(){
  var previousSound=window.sound;
  window.GEI_AUDIO_UNLOCK=function(){
    try{
      if(typeof init==='function'){
        var c=init();
        if(c && c.state==='suspended'){
          var p=c.resume();
          if(p&&p.catch)p.catch(function(){});
        }
        return !!c;
      }
    }catch(e){}
    return false;
  };
  /* Resume immediately on any real gesture; capture phase runs before mission handlers. */
  ['pointerdown','touchstart','mousedown','keydown'].forEach(function(type){
    document.addEventListener(type,function(){
      try{window.GEI_AUDIO_UNLOCK()}catch(e){}
    },{capture:true,passive:true,once:true});
  });
})();

})();

/* GEI AUDIO SAFE SOUND WRAPPER */
(function(){
  var base=window.sound;
  if(typeof base!=='function') return;
  window.sound=function(kind){
    try{
      if(window.GEI_AUDIO_UNLOCK) window.GEI_AUDIO_UNLOCK();
    }catch(e){}
    return base(kind);
  };
})();
