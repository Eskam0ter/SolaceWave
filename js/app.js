const MIX_LIMIT = 10; // Maximum number of mixes that can be saved
const MAX_NAME_LEN = 15; // Maximum length for mix names

// List of available ambient tracks
const TRACKS = [
  { name: 'Forest',    file: './static/audio/forest.mp3',    bg: '/static/img/forest.jpg' },
  { name: 'Ocean',     file: './static/audio/ocean.mp3',     bg: '/static/img/ocean.jpg'  },
  { name: 'Cat',       file: './static/audio/cat.mp3',       bg: '/static/img/cat.jpg'    },
  { name: 'Fireplace', file: './static/audio/fireplace.mp3', bg: '/static/img/fireplace.jpg' }
];

class SolaceWaveApp {
  constructor() {
    // Cache DOM elements
    this.$ = s => document.querySelector(s);
    this.trackList    = this.$('#trackList');
    this.playBtn      = this.$('#playBtn');
    this.saveMixBtn   = this.$('#saveMix');
    this.mixList      = this.$('#mixList');
    this.volumeMaster = this.$('#volumeMaster');
    this.stage        = this.$('#stage');
    this.canvas       = this.$('#vizCanvas');
    this.ctx          = this.canvas.getContext('2d');
    this.searchInput  = this.$('#searchInput');

    // Create SVG for visualizer
    this.svgViz = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgViz.setAttribute('id', 'vizSvg');
    this.svgViz.setAttribute('viewBox', '0 0 600 600');
    this.svgViz.style.position = 'absolute';
    this.svgViz.style.top = '50%';
    this.svgViz.style.left = '50%';
    this.svgViz.style.transform = 'translate(-50%, -50%)';
    this.svgViz.style.zIndex = '0';
    this.svgViz.style.pointerEvents = 'none';
    this.svgViz.style.width = '100%';
    this.svgViz.style.height = '100%';
    this.stage.appendChild(this.svgViz);
    this.svgRays = []; // Visualizer rays

    // Setup Web Audio API
    const AC = window.AudioContext || window.webkitAudioContext;
    this.audioCtx   = new AC();
    this.analyser   = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 512;
    this.masterGain = this.audioCtx.createGain();
    this.analyser.connect(this.masterGain).connect(this.audioCtx.destination);

    // Setup audio tracks
    this.layers = TRACKS.map(tr => {
      const audio  = new Audio(tr.file); audio.loop = true;
      const source = this.audioCtx.createMediaElementSource(audio);
      const gain   = this.audioCtx.createGain();
      source.connect(gain).connect(this.analyser);
      return { ...tr, audio, gain, enabled:false, volume:1 };
    });
    this.isPlaying = false;

    this.initToasts();      // Toast UI
    this.bindUI();          // Event listeners
    this.renderAll();       // Initial UI rendering
    this.initSvgVisualizer();
    this.draw();            // Start visualization loop
    this.restoreFromHash(); // Restore mix from URL if available

    // Register service worker
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  }

  initToasts(){
    if(document.getElementById('toastContainer')) return;
    const style=document.createElement('style');
    style.textContent=`#toastContainer{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;pointer-events:none}.toast{background:rgba(0,0,0,.8);color:#fff;padding:8px 16px;margin-top:8px;border-radius:8px;font-size:14px;opacity:1;transition:opacity .4s ease,transform .4s ease;transform:translateY(0)}.toast.fade{opacity:0;transform:translateY(-10px)}`;
    document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend','<div id="toastContainer"></div>');
  }

  // Show toast notification
  toast(msg,ms=3000){
    const c=document.getElementById('toastContainer'); if(!c) return;
    const t=document.createElement('div'); t.className='toast'; t.textContent=msg; c.appendChild(t);
    setTimeout(()=>t.classList.add('fade'),ms-400); setTimeout(()=>t.remove(),ms);
  }

  // Bind UI controls
  bindUI(){
    this.playBtn.onclick      = ()=> this.isPlaying ? this.pauseAll() : this.playAll();
    this.volumeMaster.oninput = e => this.masterGain.gain.value = e.target.value;
    this.saveMixBtn.onclick   = ()=> this.saveCurrentMix();
    if(this.searchInput){
      this.searchInput.placeholder='Search mix…';
      this.searchInput.addEventListener('input', e=> this.filterMixes(e.target.value.trim().toLowerCase()));
    }
    window.addEventListener('popstate', ()=> this.restoreFromHash());
  }

  // Render tracks and mixes
  renderAll(){ this.renderTrackList(); this.renderMixList(); }

  // Render list of sound tracks with volume controls
  renderTrackList(){
    this.trackList.innerHTML='';
    this.layers.forEach((l,i)=>{
      const li=document.createElement('li');
      li.className='track-item'+(l.enabled?' active':'');
      li.onclick=()=>this.toggleLayer(i);
      const label=document.createElement('span'); label.textContent=l.name;
      const vol=document.createElement('input'); Object.assign(vol,{type:'range',min:0,max:1,step:0.01,value:l.volume,className:'track-vol'});
      vol.oninput=e=>this.setLayerVolume(i,e.target.value);
      ['click','pointerdown','pointerup','pointermove','mousedown','mouseup'].forEach(ev=>vol.addEventListener(ev,e=>e.stopPropagation()));
      li.append(label,vol); this.trackList.appendChild(li);
    });
    this.updatePlayBtn();
  }

  // Render saved mixes from localStorage
  renderMixList(){
    this.mixList.innerHTML='';
    Object.keys(localStorage).filter(k=>k.startsWith('mix_')).sort().forEach(key=>{
      const li=document.createElement('li');
      const name=key.slice(4);
      const span=document.createElement('span'); span.textContent=name; span.className='mix-name';
      span.onclick = ()=> this.loadMix(key);
      span.ondblclick = ()=> this.startRenameMix(li,span,key);
      const del=document.createElement('button'); del.className='mix-delete'; del.type='button'; del.textContent='✖'; del.title='Delete';
      del.onclick=()=>{localStorage.removeItem(key); this.renderMixList();};
      li.append(span,del); this.mixList.appendChild(li);
    });
    if(this.searchInput) this.filterMixes(this.searchInput.value.trim().toLowerCase());
  }

  // Filter mix list by search term
  filterMixes(term=''){
    this.mixList.querySelectorAll('li').forEach(li=>{
      li.style.display = term==='' || li.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  }

  // Enable/disable track layer
  toggleLayer(idx){
    const L=this.layers[idx]; L.enabled=!L.enabled;
    if(L.enabled){ if(this.audioCtx.state==='suspended') this.audioCtx.resume(); L.audio.play(); this.swapBackground(L.bg); }
    else{ L.audio.pause(); if(!this.layers.some(l=>l.enabled)) this.pauseAll(); }
    this.renderTrackList();
  }

  // Adjust individual track volume
  setLayerVolume(idx,val){ const L=this.layers[idx]; L.volume=val; L.gain.gain.value=val; }

  // Play/pause all active tracks
  playAll(){ this.layers.filter(l=>l.enabled).forEach(l=>l.audio.play()); this.isPlaying=true; this.updatePlayBtn(); }
  pauseAll(){ this.layers.forEach(l=>l.audio.pause()); this.isPlaying=false; this.updatePlayBtn(); }

  // Update play/pause button appearance
  updatePlayBtn(){ if(!this.layers.some(l=>l.enabled)){ this.playBtn.textContent='►'; this.playBtn.disabled=true; } else { this.playBtn.disabled=false; this.playBtn.textContent=this.isPlaying?'❚❚':'►'; } }

  // Generate next mix index for naming
  nextMixIndex(){ let n=1; while(localStorage.getItem('mix_Mix #'+n)) n++; return n; }

  // Save current active mix to localStorage
  saveCurrentMix(){
    const active=this.layers.filter(l=>l.enabled); if(!active.length){ this.toast('Please enable a sound first'); return; }
    if(Object.keys(localStorage).filter(k=>k.startsWith('mix_')).length>=MIX_LIMIT){ this.toast(`Maximum ${MIX_LIMIT} mixes`); return; }
    let name='Mix #'+this.nextMixIndex(); while(localStorage.getItem('mix_'+name)) name+='-1';
    localStorage.setItem('mix_'+name, JSON.stringify(this.layers.map(l=>({e:l.enabled,v:l.volume}))));
    this.renderMixList(); this.saveHash(name);
  }

  // Load and apply mix config from localStorage
  loadMix(key){
    const cfg=JSON.parse(localStorage.getItem(key)||'[]');
    cfg.forEach((c,i)=>{ this.layers[i].enabled=c.e; this.layers[i].volume=c.v; this.layers[i].gain.gain.value=c.v; c.e? (this.layers[i].audio.play(), this.swapBackground(this.layers[i].bg)) : this.layers[i].audio.pause(); });
    this.isPlaying=this.layers.some(l=>l.enabled); this.renderTrackList();
    this.saveHash(key.slice(4));
  }

  // Inline renaming of saved mix
  startRenameMix(li,span,storageKey){
    const oldName=span.textContent.trim();
    const input=document.createElement('input'); Object.assign(input,{type:'text',value:oldName,maxLength:MAX_NAME_LEN,className:'mix-rename'});
    li.replaceChild(input,span); input.focus(); input.select();
    let done=false;
    const finish=save=>{
      if(done) return; done=true;
      const newName=input.value.trim();
      if(!save){ this.renderMixList(); return; }
      if(!newName){ this.toast('Name cannot be empty'); done=false; input.focus(); return; }
      if(newName.length>MAX_NAME_LEN){ this.toast(`Maximum ${MAX_NAME_LEN} characters`); done=false; input.focus(); return; }
      if(newName.toLowerCase()!==oldName.toLowerCase() && localStorage.getItem('mix_'+newName)){ this.toast('Name is already taken'); done=false; input.focus(); return; }
      if(newName.toLowerCase()!==oldName.toLowerCase()){ localStorage.setItem('mix_'+newName,localStorage.getItem(storageKey)); localStorage.removeItem(storageKey); this.saveHash(newName); }
      this.renderMixList();
    };
    input.onblur=()=>finish(true);
    input.onkeydown=e=>{ if(e.key==='Enter'){e.preventDefault(); finish(true);} if(e.key==='Escape'){e.preventDefault(); finish(false);} };
  }

  // Save mix name into URL hash
  saveHash(name){ history.pushState({mix:name},'',`#${encodeURIComponent(name)}`); }

  // Load mix from hash in URL
  restoreFromHash(){ const h=decodeURIComponent(location.hash.slice(1)); if(h && localStorage.getItem('mix_'+h)) this.loadMix('mix_'+h); }

  // Swap background image with smooth transition
  swapBackground(url){ const prev=getComputedStyle(this.stage).getPropertyValue('--bg1')||'none'; this.stage.style.setProperty('--bg0',prev.trim()); this.stage.style.setProperty('--bg1',`url('${url}')`); this.stage.classList.remove('swap'); void this.stage.offsetWidth; this.stage.classList.add('swap'); }

  // Create SVG visualizer rays in circular layout
  initSvgVisualizer() {
    const NS = "http://www.w3.org/2000/svg";
    const cx = 300;
    const cy = 300;
    const count = 128;

    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      const x1 = cx + Math.cos(angle) * 100;
      const y1 = cy + Math.sin(angle) * 100;

      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('stroke', '#8AFFD1');
      line.setAttribute('stroke-width', '2');
      this.svgViz.appendChild(line);
      this.svgRays.push({ line, angle });
    }
  }

  // Continuously update SVG visualizer based on audio frequency
  draw() {
    requestAnimationFrame(() => this.draw());
    const freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(freq);
    this.svgRays.forEach((r, i) => {
      const amp = freq[i] || 0;
      const len = 50 + (amp / 255) * 100;
      const x2 = 300 + Math.cos(r.angle) * (100 + len);
      const y2 = 300 + Math.sin(r.angle) * (100 + len);
      r.line.setAttribute('x2', x2);
      r.line.setAttribute('y2', y2);
    });
  }
}

// Launch app after DOM is loaded
window.addEventListener('DOMContentLoaded',()=> new SolaceWaveApp());
