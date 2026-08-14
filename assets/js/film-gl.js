/* Fire & Ash — curved film wall (raw WebGL, no dependencies)
   Genuinely cylindrical panels around the viewer. Center film plays as a
   live video texture; neighbors show posters. Falls back to the CSS
   carousel when WebGL is unavailable. */
(function () {
  'use strict';
  const vstage = document.querySelector('.vstage');
  if (!vstage) return;
  const scene = vstage.querySelector('.vstage-scene');
  const scrub = vstage.querySelector('.vscrub');
  const thumb = vstage.querySelector('.vscrub-thumb');
  const tiles = [...vstage.querySelectorAll('.vtile')];
  const N = tiles.length;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, powerPreference: 'low-power' });
  if (!gl || reduced) { document.documentElement.classList.add('film-css'); return; }
  document.documentElement.classList.add('film-gl');
  canvas.className = 'film-canvas';
  scene.appendChild(canvas);

  /* ── shaders ── */
  const vsrc = `
    attribute vec2 aPos;            // ax in [-1,1], ay in [-1,1]
    uniform float uTheta;           // tile center angle on the cylinder
    uniform float uHalfW;           // angular half-width of the tile
    uniform float uHalfH;           // half height (world units)
    uniform float uR;               // cylinder radius
    uniform mat4 uProj;
    varying vec2 vUV;
    void main () {
      float phi = uTheta + aPos.x * uHalfW;
      vec3 world = vec3(uR * sin(phi), aPos.y * uHalfH, -uR * cos(phi) + uR * 0.42);
      vUV = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
      gl_Position = uProj * vec4(world, 1.0);
    }`;
  const fsrc = `
    precision mediump float;
    uniform sampler2D uTex;
    uniform float uBright;
    varying vec2 vUV;
    void main () {
      vec4 c = texture2D(uTex, vUV);
      // soft edge vignette on each panel
      float e = smoothstep(0.0, 0.06, vUV.x) * smoothstep(1.0, 0.94, vUV.x);
      gl_FragColor = vec4(c.rgb * uBright * (0.75 + 0.25 * e), 1.0);
    }`;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vsrc));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fsrc));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  /* ── geometry: 48-segment strip so the bend is smooth ── */
  const SEG = 48, verts = [];
  for (let i = 0; i <= SEG; i++) {
    const x = (i / SEG) * 2 - 1;
    verts.push(x, -1, x, 1);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uTheta = U('uTheta'), uHalfW = U('uHalfW'), uHalfH = U('uHalfH'),
        uR = U('uR'), uProj = U('uProj'), uBright = U('uBright');

  /* ── textures: posters now, video for the settled center ── */
  const mkTex = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([24, 20, 17]));
    return t;
  };
  const items = tiles.map((t) => {
    const v = t.querySelector('video');
    const item = { video: v, tex: mkTex(), aspect: 9 / 16, posterReady: false };
    const img = new Image();
    img.onload = () => {
      item.aspect = img.naturalWidth / img.naturalHeight;
      gl.bindTexture(gl.TEXTURE_2D, item.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      item.posterReady = true;
      needsDraw = true;
    };
    img.src = v.getAttribute('poster');
    return item;
  });

  /* ── state ── */
  const R = 2.35, STEP = 0.62;         // radius + angular gap between films
  let p = 0, target = 0, needsDraw = true, inView = true;
  let dragging = null, moved = 0, startX = 0, startP = 0;
  const thumbW = 56;

  const proj = new Float32Array(16);
  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = scene.clientWidth * dpr;
    canvas.height = scene.clientHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const fov = 0.9, aspect = canvas.width / canvas.height, near = 0.1, far = 30;
    const f = 1 / Math.tan(fov / 2);
    proj.set([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]);
    gl.uniformMatrix4fv(uProj, false, proj);
    needsDraw = true;
  };

  const draw = () => {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const c = Math.round(p);
    const settled = Math.abs(p - c) < 0.12;
    const order = items.map((_, i) => i).sort((a, b) => Math.abs(b - p) - Math.abs(a - p));
    order.forEach((i) => {
      const d = i - p;
      if (Math.abs(d) > 2.4) return;
      const it = items[i];
      const H = 1.12;
      const theta = d * STEP;
      const halfH = H / 2;
      const halfW = (H * it.aspect) / 2 / R; // angular
      // live video frame for the settled center
      if (i === c && settled && it.video.readyState >= 2 && !it.video.paused) {
        gl.bindTexture(gl.TEXTURE_2D, it.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, it.video);
      } else {
        gl.bindTexture(gl.TEXTURE_2D, it.tex);
      }
      gl.uniform1f(uTheta, theta);
      gl.uniform1f(uHalfW, halfW);
      gl.uniform1f(uHalfH, halfH);
      gl.uniform1f(uR, R);
      gl.uniform1f(uBright, Math.max(0.12, 1 - Math.abs(d) * 0.62));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, (SEG + 1) * 2);
    });
    // playback control
    items.forEach((it, i) => {
      if (i === c && settled && inView) { if (it.video.paused) it.video.play().catch(() => {}); }
      else if (!it.video.paused) it.video.pause();
    });
    // slider thumb
    const frac = (N > 1) ? Math.max(0, Math.min(1, p / (N - 1))) : 0;
    thumb.style.width = thumbW + 'px';
    thumb.style.left = (frac * (scrub.clientWidth - thumbW)) + 'px';
  };

  const loop = () => {
    if (p !== target) {
      p += (target - p) * 0.14;
      if (Math.abs(target - p) < 0.002) p = target;
      needsDraw = true;
    }
    const c = Math.round(p);
    const playing = Math.abs(p - c) < 0.12 && items[c] && !items[c].video.paused;
    if (needsDraw || playing) { draw(); needsDraw = false; }
    if (inView) requestAnimationFrame(loop);
  };

  /* ── interaction (same slider + drag contract as before) ── */
  const clampP = (v) => Math.max(-0.3, Math.min(N - 0.7, v));
  scene.addEventListener('pointerdown', (e) => {
    dragging = 'scene'; moved = 0; startX = e.clientX; startP = p;
    vstage.classList.add('dragging');
  });
  scrub.addEventListener('pointerdown', (e) => {
    dragging = 'scrub'; moved = 0; startX = e.clientX; startP = p;
    scrub.classList.add('dragging');
    if (!e.target.closest('.vscrub-thumb')) {
      const rect = scrub.getBoundingClientRect();
      const fracc = (e.clientX - rect.left - thumbW / 2) / (rect.width - thumbW);
      p = target = clampP(fracc * (N - 1));
      startP = p; needsDraw = true;
    }
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (dragging === 'scene') p = clampP(startP - dx / (scene.clientWidth * 0.5));
    else p = clampP(startP + dx / Math.max(1, scrub.clientWidth - thumbW) * (N - 1));
    target = p; needsDraw = true;
  }, { passive: true });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = null;
    vstage.classList.remove('dragging');
    scrub.classList.remove('dragging');
    target = Math.max(0, Math.min(N - 1, Math.round(p)));
  });
  scene.addEventListener('click', (e) => {
    if (moved > 8) return;
    const rect = scene.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width; // 0..1
    const c = Math.round(p);
    if (nx > 0.32 && nx < 0.68) {
      if (Math.abs(p - c) < 0.2) openFilm(tiles[c].dataset.video);
    } else if (nx <= 0.32) { target = Math.max(0, c - 1); }
    else { target = Math.min(N - 1, c + 1); }
  });

  /* expanded player */
  const flb = document.createElement('div');
  flb.className = 'vlb';
  flb.setAttribute('role', 'dialog');
  flb.setAttribute('aria-label', 'Film player');
  flb.innerHTML = '<div class="lb-veil"></div><video controls playsinline preload="none"></video><button class="lb-close" aria-label="Close film">Close</button>';
  document.body.appendChild(flb);
  const flbVideo = flb.querySelector('video');
  const openFilm = (src) => {
    items.forEach(it => it.video.pause());
    flbVideo.src = src;
    flb.classList.add('open');
    document.body.style.overflow = 'hidden';
    flbVideo.play().catch(() => {});
  };
  const closeFilm = () => {
    flb.classList.remove('open');
    flbVideo.pause(); flbVideo.removeAttribute('src'); flbVideo.load();
    document.body.style.overflow = '';
    needsDraw = true;
  };
  flb.querySelector('.lb-close').addEventListener('click', closeFilm);
  flb.querySelector('.lb-veil').addEventListener('click', closeFilm);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && flb.classList.contains('open')) closeFilm(); });

  /* only render while on screen */
  new IntersectionObserver((es) => {
    es.forEach((en) => {
      const was = inView; inView = en.isIntersecting;
      if (inView && !was) requestAnimationFrame(loop);
      if (!inView) items.forEach(it => it.video.pause());
    });
  }, { threshold: 0.05 }).observe(scene);

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
})();
