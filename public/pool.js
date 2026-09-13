// Animate the supplied artwork; preserve the static image on unsupported devices.
(() => {
  const image = document.getElementById('pool-image');
  const canvas = document.getElementById('pool-animation');
  const scene = document.getElementById('pool-scene');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!image || !canvas || motion.matches) return;
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return;
  let frame = 0, lastFrame = 0, ready = false, rewardStart = -100000;
  window.addEventListener('zkat:reward', () => { rewardStart = performance.now(); });
  const vertex = `attribute vec2 position; varying vec2 uv;
    void main(){ uv=vec2(position.x*.5+.5,.5-position.y*.5); gl_Position=vec4(position,0.,1.); }`;
  const fragment = `precision mediump float;
    varying vec2 uv; uniform sampler2D art; uniform float time; uniform float rewardAge;
    void main(){
      vec2 p=uv;
      vec3 original=texture2D(art,p).rgb;
      float wet=smoothstep(.035,.19,original.b-original.r)*smoothstep(.29,.34,p.y);
      float pool=smoothstep(.49,.53,p.y)*(1.-smoothstep(.62,.67,p.y))*wet;
      vec2 delta=(p-vec2(.5,.54))*vec2(1.,2.8);
      float radius=length(delta);
      float arrival=rewardAge-1.25;
      float splash=step(0.,arrival)*(1.-smoothstep(0.,2.5,arrival));
      float wave=sin(radius*70.-time*3.6)*.0035*exp(-radius*2.);
      wave+=sin(radius*58.-arrival*12.)*.011*splash*exp(-radius*2.);
      p+=normalize(delta+vec2(.0001))*wave*pool;
      float spill=smoothstep(.62,.68,p.y)*wet;
      p.x+=sin(p.y*65.-time*3.4)*.0032*spill;
      p.y+=sin(p.x*43.-time*3.)*.0022*spill;
      float stream=(1.-smoothstep(.003,.016,abs(p.x-.5)))
        *smoothstep(.29,.32,p.y)*(1.-smoothstep(.52,.55,p.y));
      p.x+=sin(p.y*42.-time*4.)*.0022*stream;
      // Move a magnified section of the existing liquid down the stream on a real increase.
      float falling=step(0.,rewardAge)*(1.-step(1.25,rewardAge));
      float dropY=.30+.24*pow(clamp(rewardAge/1.25,0.,1.),1.6);
      float drop=exp(-pow((p.y-dropY)/.024,2.))*falling;
      float core=1.-smoothstep(.014,.032,abs(p.x-.502));
      p.x=.502+(p.x-.502)/(1.+1.6*drop*core);
      vec3 color=texture2D(art,clamp(p,0.,1.)).rgb;
      float blue=clamp((color.b-color.r)*3.,0.,1.);
      color*=1.+sin(p.y*80.-time*7.)*.23*stream*blue;
      color+=vec3(.13,.24,.4)*drop*core*blue;
      color*=1.+sin(radius*85.-time*3.6)*.055*pool*blue;
      color*=1.+sin(p.y*75.-time*5.)*.085*spill*blue;
      color*=1.+splash*.24*pool*blue;
      gl_FragColor=vec4(color,1.);
    }`;
  function shader(type, source) {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Water shader unavailable');
    return s;
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; }
  function render(timestamp) {
    if (document.hidden || motion.matches || !ready) { stop(); return; }
    if (timestamp - lastFrame >= 32) {
      lastFrame = timestamp;
      gl.uniform1f(gl.getUniformLocation(program, 'time'), timestamp * .001);
      gl.uniform1f(gl.getUniformLocation(program, 'rewardAge'), (timestamp-rewardStart)*.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    frame = requestAnimationFrame(render);
  }
  let program;
  function start() {
    if (ready) return;
    try {
      program = gl.createProgram();
      gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Water unavailable');
      gl.useProgram(program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.uniform1i(gl.getUniformLocation(program,'art'),0);
      const resize=()=>{
        const side=Math.max(1,Math.round(scene.clientWidth*Math.min(devicePixelRatio||1,1.5)));
        const height=Math.max(1,Math.round(side*scene.clientHeight/scene.clientWidth));
        if(canvas.width!==side||canvas.height!==height){canvas.width=side;canvas.height=height;gl.viewport(0,0,side,height);}
      };
      resize();new ResizeObserver(resize).observe(scene);
      ready=true;render(performance.now());scene.classList.add('animated');
    } catch { stop();scene.classList.remove('animated'); }
  }
  canvas.addEventListener('webglcontextlost',()=>{ready=false;stop();scene.classList.remove('animated');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(!frame&&ready)render(performance.now());});
  motion.addEventListener('change',()=>{if(motion.matches){stop();scene.classList.remove('animated');}else if(ready){scene.classList.add('animated');render(performance.now());}});
  if(image.complete&&image.naturalWidth)start();else image.addEventListener('load',start,{once:true});
})();
