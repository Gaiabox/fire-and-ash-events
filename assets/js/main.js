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
      entries.forEach((e) => { if (e.isIntersecting && !turfDone) { lockTurf(); turfIO.disconnect(); } });
    }, { threshold: 0.55 });
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
const reserveForms = [...document.querySelectorAll('form[name="reserve-waitlist"]')];
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
      reserveForm.innerHTML = '<p style="font-family:Fraunces,serif;font-style:italic;font-size:1.3rem;color:var(--champagne)">You’re on the list. Watch your inbox. <span class="spark">✦</span></p>';
    } catch {}
  });
});

/* ── Gallery lightbox: FLIP zoom from grid, PREV/CLOSE/NEXT ── */
const galleryFigs = [...document.querySelectorAll('.masonry figure')].filter(f => f.querySelector('img'));
if (galleryFigs.length) {
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-label', 'Photo viewer');
  lb.innerHTML = '<div class="lb-veil"></div><span class="lb-count"></span>'
    + '<figure class="lb-img"><img alt=""></figure>'
    + '<button class="lb-prev" aria-label="Previous photo">Prev</button>'
    + '<button class="lb-next" aria-label="Next photo">Next</button>'
    + '<button class="lb-close" aria-label="Close viewer">Close</button>';
  document.body.appendChild(lb);

  const box = lb.querySelector('.lb-img');
  const pic = box.querySelector('img');
  const count = lb.querySelector('.lb-count');
  const DUR = 190;
  let idx = -1, open = false;

  const fitRect = (w, h) => {
    const pad = window.innerWidth < 700 ? 14 : 56;
    const maxW = window.innerWidth - pad * 2;
    const maxH = window.innerHeight - pad * 2;
    const s = Math.min(maxW / w, maxH / h);
    const fw = w * s, fh = h * s;
    return { x: (window.innerWidth - fw) / 2, y: (window.innerHeight - fh) / 2, w: fw, h: fh };
  };

  const srcAt = (i) => galleryFigs[i].querySelector('img');

  const setImage = (i) => {
    const t = srcAt(i);
    pic.src = t.currentSrc || t.src;
    pic.alt = t.alt;
    count.textContent = (i + 1) + ' / ' + galleryFigs.length;
    const w = t.naturalWidth || 1200, h = t.naturalHeight || 1600;
    const f = fitRect(w, h);
    box.style.left = f.x + 'px'; box.style.top = f.y + 'px';
    box.style.width = f.w + 'px'; box.style.height = f.h + 'px';
    // preload neighbors
    [i - 1, i + 1].forEach((n) => {
      const nn = (n + galleryFigs.length) % galleryFigs.length;
      const im = new Image(); im.src = srcAt(nn).currentSrc || srcAt(nn).src;
    });
  };

  const openAt = (i) => {
    idx = i; open = true;
    const t = srcAt(i);
    const r = t.getBoundingClientRect();
    setImage(i);
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    // FLIP: from thumbnail rect to final rect
    const f = box.getBoundingClientRect();
    const sx = r.width / f.width, sy = r.height / f.height;
    box.style.transition = 'none';
    box.style.transform = `translate(${r.left - f.left}px,${r.top - f.top}px) scale(${sx},${sy})`;
    requestAnimationFrame(() => {
      box.style.transition = `transform ${DUR}ms cubic-bezier(.2,.9,.25,1)`;
      box.style.transform = 'none';
    });
  };

  const close = () => {
    if (!open) return;
    open = false;
    const t = srcAt(idx);
    const r = t.getBoundingClientRect();
    const f = box.getBoundingClientRect();
    const sx = r.width / f.width, sy = r.height / f.height;
    box.style.transition = `transform ${DUR}ms cubic-bezier(.2,.9,.25,1)`;
    box.style.transform = `translate(${r.left - f.left}px,${r.top - f.top}px) scale(${sx},${sy})`;
    lb.querySelector('.lb-veil').style.opacity = 0;
    setTimeout(() => {
      lb.classList.remove('open');
      box.style.transform = 'none';
      lb.querySelector('.lb-veil').style.opacity = '';
      document.body.style.overflow = '';
    }, DUR);
  };

  const step = (dir) => {
    idx = (idx + dir + galleryFigs.length) % galleryFigs.length;
    box.style.transition = `opacity 90ms ease-out`;
    box.style.opacity = 0;
    setTimeout(() => { setImage(idx); box.style.opacity = 1; }, 90);
  };

  galleryFigs.forEach((f, i) => f.addEventListener('click', () => openAt(i)));
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-veil').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', () => step(-1));
  lb.querySelector('.lb-next').addEventListener('click', () => step(1));
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  // touch swipe
  let tx = null;
  lb.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 48) step(dx > 0 ? -1 : 1);
    tx = null;
  }, { passive: true });
  window.addEventListener('resize', () => { if (open) setImage(idx); });
}

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
