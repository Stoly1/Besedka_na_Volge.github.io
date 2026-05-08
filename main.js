/* ============== CAPABILITY DETECTION ============== */
const IS_MOBILE = window.matchMedia('(max-width: 900px)').matches;
const IS_TOUCH  = window.matchMedia('(hover: none)').matches;
const REDUCED   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR_CAP   = IS_MOBILE ? 1.5 : 2;

// Helper: only run an rAF loop while the element is on-screen
function visibilityGate(el, onVisibleChange) {
  if (!el) return;
  let visible = false;
  const io = new IntersectionObserver((entries) => {
    const isVis = entries[0].isIntersecting;
    if (isVis !== visible) {
      visible = isVis;
      onVisibleChange(visible);
    }
  }, { threshold: 0 });
  io.observe(el);
}

/* ============== HERO PARTICLES (fairy lights) ============== */
(function() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || REDUCED) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  let running = true;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, DPR_CAP);
    w = canvas.width  = canvas.offsetWidth * dpr;
    h = canvas.height = canvas.offsetHeight * dpr;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeParticle() {
    const dpr = Math.min(window.devicePixelRatio, DPR_CAP);
    return {
      x: Math.random() * w,
      y: h + Math.random() * 100,
      vy: -rand(0.2, 0.7) * dpr,
      vx: rand(-0.15, 0.15) * dpr,
      r: rand(1, 2.5) * dpr,
      glow: rand(8, 20) * dpr,
      a: rand(0.4, 0.95),
      twinkle: rand(0.005, 0.02),
      phase: Math.random() * Math.PI * 2
    };
  }

  function init() {
    resize();
    // Sparser on mobile to save fillrate
    const divisor = IS_MOBILE ? 90000 : 40000;
    const dpr = Math.min(window.devicePixelRatio, DPR_CAP);
    const count = Math.floor((w * h) / (divisor * dpr));
    particles = Array.from({ length: count }, makeParticle);
  }

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.y += p.vy;
      p.x += p.vx;
      p.phase += p.twinkle;
      const alpha = p.a * (0.7 + 0.3 * Math.sin(p.phase));

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glow);
      grad.addColorStop(0, `rgba(255, 220, 150, ${alpha})`);
      grad.addColorStop(0.4, `rgba(240, 200, 120, ${alpha * 0.4})`);
      grad.addColorStop(1, 'rgba(240, 200, 120, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.glow, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      if (p.y < -20) {
        p.y = h + 20;
        p.x = Math.random() * w;
      }
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', init);
  init();
  tick();

  // Pause when hero scrolls off-screen — saves significant CPU/battery on phones
  visibilityGate(canvas, (v) => {
    const wasRunning = running;
    running = v;
    if (v && !wasRunning) tick();
  });
})();

/* ============== SCROLL REVEAL ============== */
(function() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => observer.observe(el));
})();

/* ============== COUNTER ANIMATION ============== */
(function() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.target;
      let current = 0;
      const step = Math.max(1, Math.floor(target / 40));
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = current;
      }, 30);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-target]').forEach(el => observer.observe(el));
})();

/* ============== TILT EFFECT (desktop only) ============== */
(function() {
  if (IS_TOUCH) return;
  document.querySelectorAll('.tilt').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1000px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

/* ============== VIDEO PLAY ON CLICK ============== */
(function() {
  document.querySelectorAll('.video-card').forEach(card => {
    const video = card.querySelector('video');
    card.addEventListener('click', () => {
      if (video.paused) {
        video.play();
        card.classList.add('playing');
      } else {
        video.pause();
        card.classList.remove('playing');
      }
    });
    if (!IS_TOUCH) {
      card.addEventListener('mouseenter', () => {
        if (video.paused) video.play().catch(() => {});
      });
      card.addEventListener('mouseleave', () => {
        if (!card.classList.contains('playing')) {
          video.pause();
          video.currentTime = 0;
        }
      });
    }
  });
})();

/* ============== 3D LOGO COIN ============== */
if (!REDUCED) import('three').then((THREE) => {
  const canvas  = document.getElementById('logo-canvas');
  const wrapper = document.querySelector('.hero-logo-3d');
  if (!canvas) return;

  const SIZE    = IS_MOBILE ? 160 : 220;
  const dpr     = Math.min(window.devicePixelRatio, DPR_CAP);
  const SEGS    = IS_MOBILE ? 48 : 80;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !IS_MOBILE });
  renderer.setPixelRatio(dpr);
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.z = 5.5;

  // Lighting
  scene.add(new THREE.AmbientLight(0xfff0d0, 0.55));
  const keyLight  = new THREE.DirectionalLight(0xffd98a, 2.4);
  keyLight.position.set(3, 2, 4); scene.add(keyLight);
  const rimLight  = new THREE.DirectionalLight(0xf0c878, 1.0);
  rimLight.position.set(-4, -1, -3); scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(0xffeedd, 0.4);
  fillLight.position.set(0, -3, 3); scene.add(fillLight);

  // Glow sprite behind coin
  const glowCvs = document.createElement('canvas');
  glowCvs.width = glowCvs.height = 256;
  const gc  = glowCvs.getContext('2d');
  const grd = gc.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0,    'rgba(255,220,100,0.7)');
  grd.addColorStop(0.35, 'rgba(240,180,60,0.25)');
  grd.addColorStop(1,    'rgba(240,180,60,0)');
  gc.fillStyle = grd; gc.fillRect(0, 0, 256, 256);
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(glowCvs),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glowSprite.scale.set(5.4, 5.4, 1);
  glowSprite.position.z = -0.4;
  scene.add(glowSprite);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4a020, metalness: 0.93, roughness: 0.18,
  });
  const placeholderFaceMat = new THREE.MeshStandardMaterial({
    color: 0x8a6418, metalness: 0.6, roughness: 0.4,
  });

  const geom = new THREE.CylinderGeometry(1.62, 1.62, 0.24, SEGS);
  const coin = new THREE.Mesh(geom, [goldMat, placeholderFaceMat, placeholderFaceMat]);
  coin.rotation.x = Math.PI / 2;

  const pivot = new THREE.Group();
  pivot.add(coin);
  scene.add(pivot);

  const clock = new THREE.Clock(false);
  clock.start();
  let frameCount = 0;
  let running = true;
  let rafId = null;

  function animate() {
    if (!running) { rafId = null; return; }
    const t = clock.getElapsedTime();
    pivot.rotation.y = t * 0.65;
    pivot.rotation.x = Math.sin(t * 0.38) * 0.13;
    glowSprite.material.opacity = 0.52 + 0.22 * Math.sin(t * 1.1);
    renderer.render(scene, camera);
    if (++frameCount === 2 && wrapper) wrapper.classList.add('three-loaded');
    rafId = requestAnimationFrame(animate);
  }
  animate();

  visibilityGate(wrapper, (v) => {
    running = v;
    if (v && rafId === null) animate();
  });

  // Load logo texture (inline data URI bypasses file:// CORS for WebGL)
  const img = new Image();
  img.onload = () => {
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2;
    tex.needsUpdate = true;
    const faceMat = new THREE.MeshStandardMaterial({
      map: tex, metalness: 0.05, roughness: 0.55,
    });
    coin.material = [goldMat, faceMat, faceMat];
  };
  img.onerror = () => console.warn('Logo texture failed to load');
  img.src = window.LOGO_DATA_URI || 'images/logo.jpg';
}).catch(err => console.warn('Three.js failed to load for logo', err));

/* ============== THREE.JS FLOATING ORBS ============== */
if (!REDUCED) import('three').then((THREE) => {
  const canvas = document.getElementById('three-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !IS_MOBILE });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_CAP));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 12;

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const orbs = [];
  const orbCount = IS_MOBILE ? 22 : 70;
  const orbGeom  = new THREE.SphereGeometry(0.12, IS_MOBILE ? 10 : 16, IS_MOBILE ? 10 : 16);

  // One shared sprite texture instead of one per orb
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = spriteCanvas.height = 128;
  const sctx = spriteCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 220, 140, 1)');
  grad.addColorStop(0.3, 'rgba(240, 200, 120, 0.5)');
  grad.addColorStop(1, 'rgba(240, 200, 120, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const sharedSpriteTex = new THREE.CanvasTexture(spriteCanvas);

  for (let i = 0; i < orbCount; i++) {
    const hue = 0.10 + Math.random() * 0.05;
    const color = new THREE.Color().setHSL(hue, 0.9, 0.6 + Math.random() * 0.2);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const orb = new THREE.Mesh(orbGeom, mat);
    orb.position.set(
      (Math.random() - 0.5) * 24,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12 - 2
    );
    orb.userData = {
      baseY: orb.position.y,
      speed: 0.3 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 1 + Math.random() * 2,
      driftX: (Math.random() - 0.5) * 0.005,
    };
    scene.add(orb);
    orbs.push(orb);

    const spriteMat = new THREE.SpriteMaterial({
      map: sharedSpriteTex, transparent: true,
      blending: THREE.AdditiveBlending, opacity: 0.6,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.6, 1.6, 1);
    orb.add(sprite);
    orb.userData.sprite = sprite;
  }

  // Mouse parallax — only on devices with a real pointer
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  if (!IS_TOUCH) {
    window.addEventListener('mousemove', (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  const clock = new THREE.Clock();
  let running = true;
  let rafId = null;

  function animate() {
    if (!running) { rafId = null; return; }
    const t = clock.getElapsedTime();
    if (!IS_TOUCH) {
      mouseX += (targetX - mouseX) * 0.04;
      mouseY += (targetY - mouseY) * 0.04;
      camera.position.x = mouseX * 1.2;
      camera.position.y = -mouseY * 0.6;
      camera.lookAt(0, 0, 0);
    }

    for (const orb of orbs) {
      const u = orb.userData;
      orb.position.y = u.baseY + Math.sin(t * u.speed + u.phase) * 0.6;
      orb.position.x += u.driftX;
      if (orb.position.x > 14)  orb.position.x = -14;
      if (orb.position.x < -14) orb.position.x =  14;

      const twinkle = 0.7 + 0.3 * Math.sin(t * u.twinkleSpeed + u.phase);
      orb.material.opacity = twinkle;
      u.sprite.material.opacity = 0.5 * twinkle;
    }

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }
  animate();

  visibilityGate(canvas, (v) => {
    running = v;
    if (v && rafId === null) animate();
  });
}).catch(err => console.warn('Three.js failed to load', err));
