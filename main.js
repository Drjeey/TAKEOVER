/**
 * THE TAKEOVER EA — main.js
 * Modules: Three.js scene · GSAP scroll animations · Navbar · UI interactions
 *
 * HOW TO SWAP IMAGES:
 *  - Hero background texture: In initHeroScene(), replace the MeshPhysicalMaterial
 *    color/emissive with a TextureLoader: const tex = new THREE.TextureLoader().load('images/your-img.jpg')
 *  - Bento card backgrounds: In index.html, each .card-bg has an inline style.
 *    Change it to: style="background-image: url('images/your-card.jpg'); background-size: cover;"
 */

/* ── Wait for all scripts to load ───────────────────── */
window.addEventListener('load', () => {
  initCursorGlow();
  initNavbar();
  initMobileMenu();
  initHeroScene();
  initVibeScene();
  initGSAP();
  initContactForm();
});

/* ═══════════════════════════════════════════════════════
   1. CURSOR GLOW
═══════════════════════════════════════════════════════ */
function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let cx = mx, cy = my;

  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  /* Smooth lerp follow */
  (function loop() {
    cx += (mx - cx) * 0.1;
    cy += (my - cy) * 0.1;
    glow.style.transform = `translate(${cx - 150}px, ${cy - 150}px)`;
    requestAnimationFrame(loop);
  })();

  /* Restore system cursor on touch devices */
  if ('ontouchstart' in window) {
    glow.style.display = 'none';
    document.body.style.cursor = 'auto';
  }
}

/* ═══════════════════════════════════════════════════════
   2. NAVBAR — hide on scroll down, show on scroll up
═══════════════════════════════════════════════════════ */
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  let lastY = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 40);
      nav.classList.toggle('hidden', y > lastY && y > 120);
      lastY = y;
      ticking = false;
    });
    ticking = true;
  });
}

/* ═══════════════════════════════════════════════════════
   3. MOBILE MENU
═══════════════════════════════════════════════════════ */
function initMobileMenu() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;

  const close = () => {
    menu.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  const toggle = () => {
    const open = menu.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) menu.querySelector('.mobile-link, .mobile-cta')?.focus();
  };

  btn.addEventListener('click', toggle);

  menu.querySelectorAll('.mobile-link, .mobile-cta').forEach(link => {
    link.addEventListener('click', close);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) close();
  });
}

/* ═══════════════════════════════════════════════════════
   4. THREE.JS — HERO SCENE
   Glassmorphic floating orb + shards, mouse parallax
═══════════════════════════════════════════════════════ */
function initHeroScene() {
  if (typeof THREE === 'undefined') return;

  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  /* ── WebGL capability check ── */
  const testCtx = document.createElement('canvas').getContext('webgl')
               || document.createElement('canvas').getContext('experimental-webgl');
  if (!testCtx) { canvas.style.display = 'none'; return; }

  /* ── Skip on mobile — hero CSS gradient suffices ── */
  if (window.innerWidth < 768) { canvas.style.display = 'none'; return; }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMedium      = window.innerWidth < 1200;

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMedium });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMedium ? 1.5 : 2));
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  /* Scene & Camera */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100);
  camera.position.z = 6;

  /* ── Lights ── */
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  const roseLight = new THREE.PointLight(0xff007f, 4, 12);
  roseLight.position.set(-3, 2, 3);
  scene.add(roseLight);

  const orangeLight = new THREE.PointLight(0xff8c00, 3, 10);
  orangeLight.position.set(3, -1, 4);
  scene.add(orangeLight);

  const blueLight = new THREE.PointLight(0x6633ff, 2, 8);
  blueLight.position.set(0, 4, 2);
  scene.add(blueLight);

  /* ── Central orb ── */
  const orbGeo = new THREE.IcosahedronGeometry(1.5, isMedium ? 3 : 4);
  const orbMat = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.9,
    thickness: 1.5,
    reflectivity: 0.8,
    transparent: true,
    opacity: 0.85,
    envMapIntensity: 1.2,
  });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  scene.add(orb);

  /* Wireframe overlay on orb */
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xff007f,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
  });
  const wireOrb = new THREE.Mesh(orbGeo, wireMat);
  wireOrb.scale.setScalar(1.01);
  scene.add(wireOrb);

  /* ── Floating shards ── */
  const shards = [];
  const shardColors = [0xff007f, 0xff8c00, 0x7b2fbe, 0xffffff];
  const shardCount  = isMedium ? 10 : 18;

  for (let i = 0; i < shardCount; i++) {
    const geo = new THREE.OctahedronGeometry(Math.random() * 0.35 + 0.08, 0);
    const mat = new THREE.MeshPhysicalMaterial({
      color: shardColors[i % shardColors.length],
      metalness: 0.3,
      roughness: 0.1,
      transmission: 0.5,
      transparent: true,
      opacity: 0.4 + Math.random() * 0.4,
    });
    const shard = new THREE.Mesh(geo, mat);
    const r     = 2.5 + Math.random() * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);

    shard.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi) - 2
    );
    shard.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    shard.userData = {
      speed:  0.002 + Math.random() * 0.006,
      axis:   new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
      floatY: Math.random() * Math.PI * 2,
      floatS: 0.3 + Math.random() * 0.5,
    };
    scene.add(shard);
    shards.push(shard);
  }

  /* ── Particle field ── */
  const pCount = isMedium ? 80 : 200;
  const pGeo   = new THREE.BufferGeometry();
  const pPos   = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3]     = (Math.random() - 0.5) * 20;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.35 });
  scene.add(new THREE.Points(pGeo, pMat));

  /* ── Mouse parallax state ── */
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  let scrollVelocity = 0, lastScroll = 0;
  let scrollRafPending = false;

  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener('scroll', () => {
    if (scrollRafPending) return;
    scrollRafPending = true;
    requestAnimationFrame(() => {
      const s = window.scrollY;
      scrollVelocity = (s - lastScroll) * 0.008;
      lastScroll = s;
      scrollRafPending = false;
    });
  });

  /* ── Debounced resize ── */
  let resizeTimer;
  const resizeHero = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }, 150);
  };
  window.addEventListener('resize', resizeHero);

  /* ── Pause render loop when hero is off-screen ── */
  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 })
    .observe(canvas);

  /* ── Render loop ── */
  let t = 0;
  const clock = new THREE.Clock();

  (function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;

    const dt = clock.getDelta();
    if (!reducedMotion) t += dt;

    /* Smooth mouse follow */
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;
    scrollVelocity *= 0.92;

    /* Orb breathe + parallax */
    orb.rotation.y = t * 0.12 + targetX * 0.4;
    orb.rotation.x = t * 0.07 + targetY * 0.25;
    orb.position.x = targetX * 0.6;
    orb.position.y = targetY * -0.3 + Math.sin(t * 0.5) * 0.15;
    orb.scale.setScalar(1 + Math.sin(t * 0.8) * 0.03 + Math.abs(scrollVelocity) * 0.2);

    wireOrb.rotation.copy(orb.rotation);
    wireOrb.scale.copy(orb.scale);
    wireOrb.scale.multiplyScalar(1.01);

    /* Shards orbit */
    shards.forEach((s) => {
      s.rotateOnAxis(s.userData.axis, s.userData.speed);
      s.position.y += Math.sin(t * s.userData.floatS + s.userData.floatY) * 0.002;
    });

    /* Camera Z drift on scroll */
    camera.position.z = 6 - window.scrollY * 0.004;

    renderer.render(scene, camera);
  })();
}

/* ═══════════════════════════════════════════════════════
   5. THREE.JS — VIBE / MANIFESTO SCENE
   Abstract flowing lines / aurora effect
═══════════════════════════════════════════════════════ */
function initVibeScene() {
  if (typeof THREE === 'undefined') return;

  const canvas = document.getElementById('vibeCanvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(1); /* keep cheap */
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, canvas.offsetWidth / canvas.offsetHeight, 0.1, 50);
  camera.position.z = 4;

  /* Flowing ribbon strips */
  const ribbons = [];
  const rColors = [0xff007f, 0xff8c00, 0x7b2fbe];

  for (let r = 0; r < 3; r++) {
    const pts   = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      pts.push(new THREE.Vector3((i / count - 0.5) * 14, 0, 0));
    }
    const curve  = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 80, 0.012, 4, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: rColors[r],
      transparent: true,
      opacity: 0.6,
    });
    const ribbon = new THREE.Mesh(tubeGeo, tubeMat);
    ribbon.userData = { pts, offset: r * 2.1, speed: 0.35 + r * 0.15 };
    scene.add(ribbon);
    ribbons.push(ribbon);
  }

  const clock = new THREE.Clock();

  let vibeResizeTimer;
  const resizeVibe = () => {
    clearTimeout(vibeResizeTimer);
    vibeResizeTimer = setTimeout(() => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }, 150);
  };
  window.addEventListener('resize', resizeVibe);

  /* Intersection Observer — only animate when visible */
  let visible = false;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.1 })
    .observe(canvas);

  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;

    const t = clock.getElapsedTime();

    ribbons.forEach((ribbon, ri) => {
      const { pts, offset, speed } = ribbon.userData;
      pts.forEach((pt, i) => {
        pt.y = Math.sin(i * 0.18 + t * speed + offset) * (0.5 + ri * 0.35)
             + Math.sin(i * 0.05 + t * 0.2 + offset) * 0.8;
        pt.z = Math.cos(i * 0.12 + t * speed * 0.7) * 0.3;
      });
      const curve     = new THREE.CatmullRomCurve3(pts);
      const positions = ribbon.geometry.attributes.position;
      const tubePts   = curve.getPoints(positions.count - 1);
      for (let k = 0; k < tubePts.length && k < positions.count; k++) {
        positions.setXYZ(k, tubePts[k].x, tubePts[k].y, tubePts[k].z);
      }
      positions.needsUpdate = true;
    });

    renderer.render(scene, camera);
  })();
}

/* ═══════════════════════════════════════════════════════
   6. GSAP SCROLL ANIMATIONS
═══════════════════════════════════════════════════════ */
function initGSAP() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  /* ── Reveal up (skip hero items — handled by hero stagger below) ── */
  gsap.utils.toArray('.reveal-up').forEach((el) => {
    if (el.closest('.hero-content')) return;
    const delay = parseFloat(el.dataset.delay || 0);
    gsap.fromTo(el,
      { y: 30, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.9, delay,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
      }
    );
  });

  /* ── Reveal left ── */
  gsap.utils.toArray('.reveal-left').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.fromTo(el,
      { x: -36, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
      }
    );
  });

  /* ── Reveal right ── */
  gsap.utils.toArray('.reveal-right').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.fromTo(el,
      { x: 36, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
      }
    );
  });

  /* ── Hero stagger on load (hero section only) ── */
  const heroItems = document.querySelectorAll('.hero-content .reveal-up');
  gsap.fromTo(heroItems,
    { y: 36, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.0, stagger: 0.15, ease: 'power3.out', delay: 0.2 }
  );
  gsap.fromTo('.hero-badge.badge-left',  { x: -36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.8 });
  gsap.fromTo('.hero-badge.badge-right', { x:  36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.9 });

  /* ── Parallax depth on bento cards ── */
  gsap.utils.toArray('.bento-card').forEach((card, i) => {
    const depth = (i % 3 === 1) ? -20 : -10;
    gsap.to(card, {
      y: depth,
      ease: 'none',
      scrollTrigger: {
        trigger: '.bento-grid',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
      },
    });
  });

  /* ── Scroll parallax: hero headline drifts up as hero exits ── */
  const headline = document.querySelector('.hero-headline');
  if (headline) {
    gsap.to(headline, {
      y: -60,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
      },
    });
  }

  /* ── Service cards stagger ── */
  gsap.utils.toArray('.service-card').forEach((card, i) => {
    gsap.fromTo(card,
      { y: 60, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.9, delay: i * 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.services-grid', start: 'top 82%', toggleActions: 'play none none none' },
      }
    );
  });

  /* ── Ticker speed up on scroll ── */
  const ticker = document.querySelector('.ticker-track');
  if (ticker) {
    ScrollTrigger.create({
      trigger: '.ticker-wrap',
      start: 'top 90%',
      onEnter: () => ticker.style.animationDuration = '16s',
      onLeave: () => ticker.style.animationDuration = '28s',
    });
  }
}

/* ═══════════════════════════════════════════════════════
   7. CONTACT FORM
   SETUP: Sign up at formspree.io, create a form, copy the ID
   into the data-formspree-id attribute on <form id="contactForm">.
═══════════════════════════════════════════════════════ */
function initContactForm() {
  const form    = document.getElementById('contactForm');
  const note    = document.getElementById('formNote');
  const submitBtn = document.getElementById('formSubmit');
  const textarea  = document.getElementById('fmsg');
  const charCount = document.getElementById('fmsg-count');
  if (!form || !note || !submitBtn) return;

  const FORMSPREE_ID = form.dataset.formspreeId;

  /* ── Character counter for textarea ── */
  if (textarea && charCount) {
    const MAX = 2000;
    textarea.addEventListener('input', () => {
      const remaining = MAX - textarea.value.length;
      charCount.textContent = remaining < 200 ? `${remaining} characters left` : '';
    });
  }

  /* ── Clear field error on input ── */
  form.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input', () => clearFieldError(el));
    el.addEventListener('change', () => clearFieldError(el));
  });

  /* ── Submit ── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;

    const name    = form.name.value.trim();
    const contact = form.contact.value.trim();
    const type    = form.type.value;
    const message = form.message.value.trim();

    /* Validate */
    let hasErrors = false;
    if (name.length < 2) {
      setFieldError('fname', 'Please enter your name (at least 2 characters).');
      hasErrors = true;
    }
    if (!contact) {
      setFieldError('femail', 'Please enter your email or WhatsApp number.');
      hasErrors = true;
    } else if (!isValidContact(contact)) {
      setFieldError('femail', 'Enter a valid email address or a phone number starting with + or 07.');
      hasErrors = true;
    }
    if (hasErrors) return;

    /* Submit */
    setLoading(true);
    clearNote();

    /* No Formspree ID configured — show setup instructions in console, still UX-safe */
    if (!FORMSPREE_ID || FORMSPREE_ID === 'YOUR_FORM_ID') {
      console.warn('[TAKEOVER EA] Formspree not configured. Set data-formspree-id on #contactForm.');
      await new Promise(r => setTimeout(r, 600)); /* simulate latency */
      setLoading(false);
      showNote('Got it! (Demo mode: wire Formspree to capture real submissions.)', 'orange');
      form.reset();
      return;
    }

    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify({ name, contact, type, message }),
      });

      if (res.ok) {
        showNote('Message sent. We\'ll hit you back soon. 🔥', 'orange');
        form.reset();
        if (charCount) charCount.textContent = '';
      } else {
        const body = await res.json().catch(() => ({}));
        const msg  = body?.errors?.[0]?.message || 'Something went wrong. Try again.';
        showNote(msg, 'rose');
      }
    } catch {
      showNote('Check your connection and try again.', 'rose');
    } finally {
      setLoading(false);
    }
  });

  /* ── Helpers ── */
  function isValidContact(val) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRe = /^(\+|07|254)\d{7,14}$/;
    return emailRe.test(val) || phoneRe.test(val.replace(/[\s\-()]/g, ''));
  }

  function setFieldError(inputId, msg) {
    const input = document.getElementById(inputId);
    const errEl = document.getElementById(`${inputId}-error`);
    if (input)  input.setAttribute('aria-invalid', 'true');
    if (errEl)  errEl.textContent = msg;
    input?.closest('.form-group')?.classList.add('has-error');
  }

  function clearFieldError(el) {
    const errEl = document.getElementById(`${el.id}-error`);
    el.removeAttribute('aria-invalid');
    if (errEl) errEl.textContent = '';
    el.closest?.('.form-group')?.classList.remove('has-error');
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('btn-submitting', on);
    submitBtn.querySelector('.btn-label').textContent = on ? 'Sending...' : 'Send It';
  }

  function showNote(msg, color) {
    note.textContent = msg;
    note.style.color = `var(--${color})`;
  }

  function clearNote() {
    note.textContent = '';
  }
}
