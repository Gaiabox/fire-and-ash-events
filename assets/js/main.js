// Fire & Ash — interactions (no animation library required)
document.documentElement.classList.remove('no-js');

// Header scroll state
const header = document.querySelector('.site-header');
const onScroll = () => header && header.classList.toggle('scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('scroll', () => document.body.classList.add('has-scrolled'), { once: true, passive: true });

// Elevator-door menu
const menuBtn = document.querySelector('.menu-btn');
if (menuBtn) {
  const menuLabel = menuBtn.querySelector('span');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    if (menuLabel) menuLabel.textContent = open ? 'Close' : 'Menu';
  };
  menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  const closeBtn = document.querySelector('.menu-close');
  if (closeBtn) closeBtn.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  document.querySelectorAll('.menu-inner a').forEach(a =>
    a.addEventListener('click', () => setMenu(false)));
}

// Scroll reveals via IntersectionObserver + CSS transitions
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealables = [
  ...document.querySelectorAll('[data-reveal]'),
  ...document.querySelectorAll('[data-stagger]')
];
if ('IntersectionObserver' in window && !reduced) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      if (el.hasAttribute('data-stagger')) {
        [...el.children].forEach((c, i) => {
          c.style.transitionDelay = (i * 0.08) + 's';
          c.classList.add('revealed');
        });
      } else {
        el.classList.add('revealed');
      }
      io.unobserve(el);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
  revealables.forEach((el) => io.observe(el));
  // Failsafe: reveal anything still hidden after 3s
  setTimeout(() => {
    document.querySelectorAll('[data-reveal]:not(.revealed), [data-stagger] > *:not(.revealed)')
      .forEach((el) => el.classList.add('revealed'));
  }, 3000);
} else {
  revealables.forEach((el) => {
    el.classList.add('revealed');
    [...el.children].forEach((c) => c.classList.add('revealed'));
  });
}

/* ── Recent Nights pinned rail: scroll drives horizontal travel ── */
const nights = document.querySelector('.nights');
if (nights && !reduced) {
  const track = nights.querySelector('.nights-track');
  let travel = 0, target = 0, current = 0, raf = null;

  const measure = () => {
    travel = Math.max(0, track.scrollWidth + track.offsetLeft * 2 - window.innerWidth);
    nights.style.height = (window.innerHeight + travel) + 'px';
  };

  const tick = () => {
    current += (target - current) * 0.09;
    if (Math.abs(target - current) < 0.5) current = target;
    track.style.transform = 'translate3d(' + (-current) + 'px,0,0)';
    if (current !== target) raf = requestAnimationFrame(tick);
    else raf = null;
  };

  const onNightsScroll = () => {
    const top = nights.getBoundingClientRect().top;
    target = Math.min(travel, Math.max(0, -top));
    if (!raf) raf = requestAnimationFrame(tick);
  };

  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  window.addEventListener('scroll', onNightsScroll, { passive: true });
  onNightsScroll();
}

/* ── Experience showcase: pinned linear slide (editorial) ── */
const exp = document.querySelector('.exp');
if (exp && !reduced) {
  const stage = exp.querySelector('.exp-stage');
  let travel = 0, target = 0, current = -1, raf = null;
  const measure = () => {
    travel = Math.max(0, stage.scrollWidth + stage.offsetLeft * 2 - window.innerWidth);
    exp.style.height = (window.innerHeight + travel) + 'px';
  };
  const paint = () => {
    current += (target - current) * 0.1;
    if (Math.abs(target - current) < 0.4) current = target;
    stage.style.transform = 'translate3d(' + (-current) + 'px,0,0)';
    if (current !== target) raf = requestAnimationFrame(paint);
    else raf = null;
  };
  const onExpScroll = () => {
    const total = exp.offsetHeight - window.innerHeight;
    target = Math.min(travel, Math.max(0, -exp.getBoundingClientRect().top / total * travel));
    if (!raf) raf = requestAnimationFrame(paint);
  };
  measure();
  window.addEventListener('resize', () => { measure(); onExpScroll(); });
  window.addEventListener('load', () => { measure(); onExpScroll(); });
  window.addEventListener('scroll', onExpScroll, { passive: true });
  onExpScroll();
}

/* ── Turf takeover: pause the scroll, grow the grass, play the tape ── */
const turf = document.querySelector('.turf');
if (turf) {
  const turfVideo = turf.querySelector('video');
  const grass = turf.querySelector('.turf-grass');
  if (reduced) {
    turf.classList.add('done');
  } else {
    let turfDone = false, turfLocked = false;
    const preventScroll = (e) => { if (turfLocked) e.preventDefault(); };
    const keysBlock = (e) => {
      if (!turfLocked) return;
      if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)) e.preventDefault();
    };
    const unlockTurf = () => {
      turfDone = true; turfLocked = false;
      turf.classList.add('done');
      document.documentElement.style.overflow = '';
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('keydown', keysBlock);
    };
    const lockTurf = () => {
      if (turfDone || turfLocked) return;
      turfLocked = true;
      turf.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.documentElement.style.overflow = 'hidden';
      window.addEventListener('wheel', preventScroll, { passive: false });
      window.addEventListener('touchmove', preventScroll, { passive: false });
      window.addEventListener('keydown', keysBlock);
      turfVideo.play().catch(() => {});
      grass.classList.add('grow');
      const release = () => { grass.removeEventListener('transitionend', release); unlockTurf(); };
      grass.addEventListener('transitionend', release);
      setTimeout(unlockTurf, 5400); // hard failsafe: never trap the scroll
    };
    const turfIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (turfDone) return;
        // trigger when the section fills most of the viewport (or most of itself, if small)
        const vp = window.innerHeight || document.documentElement.clientHeight || 800;
        const coverage = e.intersectionRect.height / Math.max(1, Math.min(e.boundingClientRect.height, vp));
        if (e.isIntersecting && coverage >= 0.6) { lockTurf(); turfIO.disconnect(); }
      });
    }, { threshold: [0.2, 0.35, 0.5, 0.65, 0.8] });
    turfIO.observe(turf);
  }
}

/* ── Perfect Match survey ── */
const matchForm = document.querySelector('#match-form');
if (matchForm) {
  const steps = [...matchForm.querySelectorAll('.match-step')];
  const bars = [...document.querySelectorAll('.match-progress i')];
  let cur = 0;

  const show = (i) => {
    steps[cur].classList.remove('active');
    cur = i;
    steps[cur].classList.add('active');
    bars.forEach((b, bi) => b.classList.toggle('done', bi <= cur));
  };

  matchForm.querySelectorAll('.chip-row').forEach((row) => {
    const hidden = row.parentElement.querySelector('input[type=hidden]');
    row.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        row.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
        chip.classList.add('on');
        if (hidden) hidden.value = chip.dataset.value || chip.textContent.trim();
        if (row.dataset.autoAdvance !== 'false') setTimeout(() => next(), 350);
      });
    });
  });

  const range = matchForm.querySelector('input[type=range]');
  const out = matchForm.querySelector('.guests output');
  if (range && out) {
    const paint = () => {
      const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
      range.style.setProperty('--fill', pct + '%');
      out.innerHTML = (range.value >= 300 ? '300+' : range.value) + '<small>guests</small>';
    };
    range.addEventListener('input', paint); paint();
  }

  const validate = () => {
    const active = steps[cur];
    let ok = true;
    active.querySelectorAll('input[required],select[required]').forEach((f) => {
      if (f.type === 'hidden') { if (!f.value) ok = false; return; }
      if (!f.value.trim() || (f.type === 'email' && !/.+@.+\..+/.test(f.value))) { ok = false; f.style.borderColor = '#b0553d'; }
      else f.style.borderColor = '';
    });
    return ok;
  };

  const next = () => { if (!validate()) return; if (cur < steps.length - 1) show(cur + 1); };
  matchForm.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', next));
  matchForm.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => cur > 0 && show(cur - 1)));

  matchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const data = new FormData(matchForm);
    try {
      await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() });
      show(steps.length - 1);
      setTimeout(() => document.querySelector('.match-reveal').classList.add('go'), 150);
    } catch {
      window.location.href = 'mailto:hello@fireandashevents.com?subject=Event%20Inquiry';
    }
  });
}

/* ── ambient embers on the inquire page ── */
const matchShell = document.querySelector('.match-shell');
if (matchShell && !reduced) {
  for (let i = 0; i < 12; i++) {
    const e = document.createElement('i');
    e.className = 'ember';
    const sz = 2 + (i % 4);
    e.style.cssText = `left:${(i * 8.6) % 100}%;width:${sz}px;height:${sz}px;animation-duration:${7 + (i % 5) * 2}s;animation-delay:${i * 1.1}s;--sway:${(i % 2 ? 1 : -1) * (18 + i * 5)}px`;
    matchShell.appendChild(e);
  }
}

/* ── Reserve waitlist ── */
const reserveForms = [...document.querySelectorAll('form[name="stay-in-the-know"]')];
reserveForms.forEach((reserveForm) => {
  const shell = document.querySelector('.reserve-shell');
  if (shell && !reduced) {
    for (let i = 0; i < 14; i++) {
      const e = document.createElement('i');
      e.className = 'ember';
      const s = 2 + (i % 4);
      e.style.cssText = `left:${(i * 7.3) % 100}%;width:${s}px;height:${s}px;animation-duration:${6 + (i % 5) * 2}s;animation-delay:${i * 0.9}s;--sway:${(i % 2 ? 1 : -1) * (20 + i * 4)}px`;
      shell.appendChild(e);
    }
  }
  reserveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(reserveForm);
    try {
      await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() });
      reserveForm.innerHTML = '<p class="form-success">You’re on the list. Watch your inbox. <span class="spark">✦</span></p>';
    } catch {}
  });
});



/* ── event-moment rotator: one at a time, clean crossfade ── */
const rotator = document.querySelector('.rotator');
if (rotator && !reduced) {
  const shots = [...rotator.querySelectorAll('img')];
  let ri = 0;
  setInterval(() => {
    shots[ri].classList.remove('on');
    ri = (ri + 1) % shots.length;
    shots[ri].classList.add('on');
  }, 3800);
}

/* ── turf video: expand to full film ── */
const turfExpand = document.querySelector('.turf-expand');
if (turfExpand) {
  const vlb = document.createElement('div');
  vlb.className = 'vlb';
  vlb.setAttribute('role', 'dialog');
  vlb.setAttribute('aria-label', 'Video player');
  vlb.innerHTML = '<div class="lb-veil"></div>'
    + '<video src="/assets/video/yards-full.mp4" controls playsinline preload="none"></video>'
    + '<button class="lb-close" aria-label="Close video">Close</button>';
  document.body.appendChild(vlb);
  const fullVideo = vlb.querySelector('video');
  const loopVideo = turfExpand.querySelector('video');
  const openV = () => {
    vlb.classList.add('open');
    document.body.style.overflow = 'hidden';
    loopVideo.pause();
    fullVideo.currentTime = 0;
    fullVideo.play().catch(() => {});
  };
  const closeV = () => {
    vlb.classList.remove('open');
    document.body.style.overflow = '';
    fullVideo.pause();
    loopVideo.play().catch(() => {});
  };
  const progLine = document.querySelector('.turf-video .progress i');
  if (progLine) loopVideo.addEventListener('timeupdate', () => {
    if (loopVideo.duration) progLine.style.width = (loopVideo.currentTime / loopVideo.duration * 100) + '%';
  });
  turfExpand.addEventListener('click', openV);
  vlb.querySelector('.lb-close').addEventListener('click', closeV);
  vlb.querySelector('.lb-veil').addEventListener('click', closeV);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && vlb.classList.contains('open')) closeV(); });
}

/* ═══ Scrapbook viewer: prints on a pile, scroll/drag to flip through ═══ */
const scrapFigs = [...document.querySelectorAll('.masonry figure')].filter(f => f.querySelector('img'));
if (scrapFigs.length) {
  const items = scrapFigs.map(f => {
    const i = f.querySelector('img');
    return { src: i.currentSrc || i.src, alt: i.alt || '' };
  });
  const scrap = document.createElement('div');
  scrap.className = 'scrap';
  scrap.setAttribute('role', 'dialog');
  scrap.setAttribute('aria-label', 'Photo album');
  scrap.innerHTML = '<div class="scrap-veil"></div>'
    + '<div class="print ghost g-prev"><img alt=""></div>'
    + '<div class="print ghost g-next"><img alt=""></div>'
    + '<div class="print main"><img alt=""></div>'
    + '<div class="scrap-ui">'
    + '<span class="scrap-hint">Scroll or drag to flip through</span>'
    + '<button class="scrap-close">Close</button>'
    + '<button class="scrap-prev" aria-label="Previous photo">‹ Prev</button>'
    + '<button class="scrap-next" aria-label="Next photo">Next ›</button>'
    + '<span class="scrap-count"></span>'
    + '</div>';
  document.body.appendChild(scrap);
  if (reduced) scrap.classList.add('reduced');

  const main = scrap.querySelector('.print.main');
  const mainImg = main.querySelector('img');
  const gPrev = scrap.querySelector('.g-prev img');
  const gNext = scrap.querySelector('.g-next img');
  const count = scrap.querySelector('.scrap-count');
  let idx = 0, isOpen = false, animating = false, wheelAcc = 0;

  const mod = (n) => (n + items.length) % items.length;
  const paint = () => {
    mainImg.src = items[idx].src; mainImg.alt = items[idx].alt;
    gPrev.src = items[mod(idx - 1)].src;
    gNext.src = items[mod(idx + 1)].src;
    main.style.setProperty('--tilt', (idx % 2 ? 1.4 : -1.4) + 'deg');
    count.textContent = (idx + 1) + ' / ' + items.length;
    [mod(idx + 2), mod(idx - 2)].forEach(n => { const im = new Image(); im.src = items[n].src; });
  };

  const openScrap = (i) => {
    idx = i; isOpen = true; paint();
    scrap.classList.add('open');
    scrap.classList.remove('hinted');
    document.body.style.overflow = 'hidden';
    setTimeout(() => scrap.classList.add('hinted'), 2600);
  };
  const closeScrap = () => {
    isOpen = false;
    scrap.classList.remove('open');
    document.body.style.overflow = '';
  };

  const step = (dir) => {
    if (animating) return;
    animating = true;
    main.classList.add(dir > 0 ? 'exit-up' : 'exit-down');
    setTimeout(() => {
      idx = mod(idx + dir); paint();
      main.classList.remove('exit-up', 'exit-down');
      main.classList.add(dir > 0 ? 'enter-down' : 'enter-up');
      // force the start frame, then release to transition into place
      void main.offsetWidth;
      main.classList.remove('enter-down', 'enter-up');
      setTimeout(() => { animating = false; }, reduced ? 0 : 330);
    }, reduced ? 0 : 300);
  };

  scrapFigs.forEach((f, i) => f.addEventListener('click', () => openScrap(i)));
  scrap.querySelector('.scrap-close').addEventListener('click', closeScrap);
  scrap.querySelector('.scrap-veil').addEventListener('click', closeScrap);
  scrap.querySelector('.scrap-prev').addEventListener('click', () => step(-1));
  scrap.querySelector('.scrap-next').addEventListener('click', () => step(1));
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') closeScrap();
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-1);
  });
  scrap.addEventListener('wheel', (e) => {
    if (!isOpen) return;
    e.preventDefault();
    if (animating) return;
    wheelAcc += e.deltaY;
    if (wheelAcc > 70) { wheelAcc = 0; step(1); }
    else if (wheelAcc < -70) { wheelAcc = 0; step(-1); }
  }, { passive: false });
  // thumb drag: print follows the finger, release to flip
  let ty = null;
  scrap.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
  scrap.addEventListener('touchmove', (e) => {
    if (ty === null || animating) return;
    e.preventDefault();
    const dy = e.touches[0].clientY - ty;
    main.style.transition = 'none';
    main.style.transform = `translate(-50%, calc(-50% + ${dy * 0.55}px)) rotate(var(--tilt))`;
  }, { passive: false });
  scrap.addEventListener('touchend', (e) => {
    if (ty === null) return;
    const dy = e.changedTouches[0].clientY - ty;
    main.style.transition = ''; main.style.transform = '';
    if (Math.abs(dy) > 64) step(dy < 0 ? 1 : -1);
    ty = null;
  }, { passive: true });
}

/* ═══ curved film carousel: slider pulls films through a 3D arc ═══ */
const vstage = document.querySelector('.vstage');
if (vstage) {
  const scene = vstage.querySelector('.vstage-scene');
  const scrub = vstage.querySelector('.vscrub');
  const thumb = vstage.querySelector('.vscrub-thumb');
  const tiles = [...vstage.querySelectorAll('.vtile')];
  const N = tiles.length;
  let p = 0, target = 0, raf = null, settled = 0;
  let dragging = null, moved = 0, startX = 0, startP = 0;
  const thumbW = 56;

  const render = () => {
    tiles.forEach((t, i) => {
      const d = i - p;
      const ad = Math.abs(d);
      if (ad > 2.3) { t.classList.add('off'); return; }
      t.classList.remove('off');
      const x = d * 78;                       // % sideways
      const ry = Math.max(-52, Math.min(52, -d * 44));
      const z = -ad * 260;
      const dim = Math.max(0, 1 - ad * 0.75); // center bright, sides fall away
      t.style.transform = `translate(-50%,-50%) translateX(${x}%) translateZ(${z}px) rotateY(${ry}deg)`;
      t.style.opacity = Math.max(0.06, dim + 0.12);
      t.style.filter = `brightness(${0.25 + dim * 0.75})`;
      t.style.zIndex = String(100 - Math.round(ad * 10));
    });
    const frac = (N > 1) ? p / (N - 1) : 0;
    thumb.style.left = (Math.max(0, Math.min(1, frac)) * (scrub.clientWidth - thumbW)) + 'px';
    thumb.style.width = thumbW + 'px';
    // playback: only the settled, centered film plays
    const c = Math.round(p);
    tiles.forEach((t, i) => {
      const v = t.querySelector('video');
      if (i === c && Math.abs(p - c) < 0.12) { if (v.paused) v.play().catch(() => {}); }
      else if (!v.paused) v.pause();
    });
  };

  const tick = () => {
    p += (target - p) * 0.14;
    if (Math.abs(target - p) < 0.002) p = target;
    render();
    if (p !== target) raf = requestAnimationFrame(tick);
    else raf = null;
  };
  const go = (v) => {
    target = Math.max(0, Math.min(N - 1, v));
    if (!raf) raf = requestAnimationFrame(tick);
  };

  // drag the scene: pull films through the curve
  scene.addEventListener('pointerdown', (e) => {
    dragging = 'scene'; moved = 0; startX = e.clientX; startP = p;
    vstage.classList.add('dragging');
  });
  // drag the slider
  scrub.addEventListener('pointerdown', (e) => {
    dragging = 'scrub'; moved = 0; startX = e.clientX; startP = p;
    scrub.classList.add('dragging');
    if (!e.target.closest('.vscrub-thumb')) {
      const rect = scrub.getBoundingClientRect();
      const frac = (e.clientX - rect.left - thumbW / 2) / (rect.width - thumbW);
      p = target = Math.max(0, Math.min(N - 1, frac * (N - 1)));
      startP = p; render();
    }
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (dragging === 'scene') p = startP - dx / (scene.clientWidth * 0.55);
    else p = startP + dx / Math.max(1, (scrub.clientWidth - thumbW)) * (N - 1);
    p = Math.max(-0.3, Math.min(N - 0.7, p));
    target = p; render();
  }, { passive: true });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = null;
    vstage.classList.remove('dragging');
    scrub.classList.remove('dragging');
    go(Math.round(p)); // snap to the nearest film
  });

  // click the centered film (not a drag) → expand with sound
  tiles.forEach((t, i) => t.addEventListener('click', (e) => {
    if (moved > 8) { e.preventDefault(); return; }
    if (i !== Math.round(p)) { go(i); return; } // clicking a side film brings it to center
    openFilm(t.dataset.video);
  }));

  const flb = document.createElement('div');
  flb.className = 'vlb';
  flb.setAttribute('role', 'dialog');
  flb.setAttribute('aria-label', 'Film player');
  flb.innerHTML = '<div class="lb-veil"></div><video controls playsinline preload="none"></video><button class="lb-close" aria-label="Close film">Close</button>';
  document.body.appendChild(flb);
  const flbVideo = flb.querySelector('video');
  const openFilm = (src) => {
    tiles.forEach(t => t.querySelector('video').pause());
    flbVideo.src = src;
    flb.classList.add('open');
    document.body.style.overflow = 'hidden';
    flbVideo.play().catch(() => {});
  };
  const closeFilm = () => {
    flb.classList.remove('open');
    flbVideo.pause(); flbVideo.removeAttribute('src'); flbVideo.load();
    document.body.style.overflow = '';
    render();
  };
  flb.querySelector('.lb-close').addEventListener('click', closeFilm);
  flb.querySelector('.lb-veil').addEventListener('click', closeFilm);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && flb.classList.contains('open')) closeFilm(); });

  window.addEventListener('resize', render);
  window.addEventListener('load', render);
  render();
}
