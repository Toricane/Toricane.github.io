/**
 * Ultra-Lightweight Dynamic Ambient Kinetic Background.
 * Renders an organic shifting liquid gradient on a low-resolution canvas,
 * blurred via CSS to guarantee maximum performance and zero CPU lag.
 * Includes mouse coordinates attraction, scroll-speed velocity physics,
 * and a sparkles button to freeze/disable the animation entirely.
 */

let canvas = null;
let ctx = null;
let animationId = null;
let isEnabled = true;

// Kinetic particles
const particles = [];
const PARTICLE_COUNT = 3;

// Interaction states
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
let lastScrollY = 0;
let scrollVelocity = 0;
let scrollVelocityTarget = 0;

// Particle class definition
class AmbientParticle {
  constructor(w, h, index) {
    this.w = w;
    this.h = h;
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    
    // Size and base velocity
    this.radius = Math.min(w, h) * (0.45 + Math.random() * 0.15);
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    
    // Oscillators for organic pulsing
    this.angle = Math.random() * Math.PI * 2;
    this.angleSpeed = 0.002 + Math.random() * 0.003;
    this.baseRadius = this.radius;

    // Color definitions based on index (Cyan, Purple, Teal)
    const colors = [
      'rgba(77, 181, 255, 0.45)',  // Accent Blue
      'rgba(147, 51, 234, 0.4)',   // Purple
      'rgba(20, 184, 166, 0.35)'   // Teal
    ];
    this.color = colors[index % colors.length];
  }

  update(width, height) {
    this.w = width;
    this.h = height;

    // Pulse size gently
    this.angle += this.angleSpeed;
    this.radius = this.baseRadius + Math.sin(this.angle) * (this.baseRadius * 0.15);

    // Apply base velocity
    this.x += this.vx;
    this.y += this.vy;

    // Mouse attraction force
    if (mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < Math.min(width, height) * 0.8) {
        // Soft pull
        this.x += (dx / dist) * 0.12;
        this.y += (dy / dist) * 0.12;
      }
    }

    // Scroll momentum force (drifts vertically)
    this.y += scrollVelocity * 0.4;

    // Boundary check with smooth deceleration bounce
    const buffer = this.radius * 0.3;
    if (this.x < -buffer) { this.x = -buffer; this.vx *= -1; }
    if (this.x > width + buffer) { this.x = width + buffer; this.vx *= -1; }
    if (this.y < -buffer) { this.y = -buffer; this.vy *= -1; }
    if (this.y > height + buffer) { this.y = height + buffer; this.vy *= -1; }
  }

  draw(context) {
    const grad = context.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius
    );
    grad.addColorStop(0, this.color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.fillStyle = grad;
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    context.fill();
  }
}

function handleResize() {
  if (!canvas) return;
  // Intentionally low resolution for high performance. CSS handles scaling and heavy blur filters.
  canvas.width = Math.ceil(window.innerWidth / 4);
  canvas.height = Math.ceil(window.innerHeight / 4);

  // Clear existing particles and rebuild matching the new bounds
  particles.length = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new AmbientParticle(canvas.width, canvas.height, i));
  }
}

function handleMouseMove(e) {
  if (!canvas) return;
  mouse.active = true;
  // Project mouse coordinates onto the downscaled canvas
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  mouse.targetX = (e.clientX - rect.left) * scaleX;
  mouse.targetY = (e.clientY - rect.top) * scaleY;
}

function tick() {
  if (!isEnabled || !ctx || !canvas) return;

  // Dampen mouse attraction position
  mouse.x += (mouse.targetX - mouse.x) * 0.08;
  mouse.y += (mouse.targetY - mouse.y) * 0.08;

  // Dampen scroll momentum velocity
  scrollVelocity += (scrollVelocityTarget - scrollVelocity) * 0.08;
  scrollVelocityTarget *= 0.92; // decay scroll target force

  // Clear background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update and draw particles
  ctx.globalCompositeOperation = 'screen';
  for (const particle of particles) {
    particle.update(canvas.width, canvas.height);
    particle.draw(ctx);
  }

  animationId = requestAnimationFrame(tick);
}

function handleScroll() {
  const currentY = window.scrollY;
  const delta = currentY - lastScrollY;
  lastScrollY = currentY;

  // Scale force to downscaled coordinate grid
  if (canvas) {
    const scaleY = canvas.height / window.innerHeight;
    scrollVelocityTarget = delta * scaleY * 1.5;
  }
}

export function initAmbientBg() {
  canvas = document.getElementById('ambient-canvas');
  const toggleBtn = document.getElementById('bg-toggle');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Configure listeners
  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  // Track when mouse leaves viewport to stop applying pointer vectors
  document.addEventListener('mouseleave', () => { mouse.active = false; }, { passive: true });

  // Check user motion preferences and cached settings
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cachedPref = localStorage.getItem('bg-animation');
  
  isEnabled = cachedPref ? (cachedPref === 'enabled') : !prefersReduced;

  // Sync canvas size and generate particles
  handleResize();
  lastScrollY = window.scrollY;

  if (isEnabled) {
    if (toggleBtn) toggleBtn.classList.remove('disabled');
    canvas.classList.remove('disabled');
    tick();
  } else {
    if (toggleBtn) toggleBtn.classList.add('disabled');
    canvas.classList.add('disabled');
  }

  // Toggle button actions
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isEnabled = !isEnabled;
      if (isEnabled) {
        localStorage.setItem('bg-animation', 'enabled');
        toggleBtn.classList.remove('disabled');
        canvas.classList.remove('disabled');
        // Reset scroll baseline to prevent large velocity jumps
        lastScrollY = window.scrollY;
        scrollVelocity = 0;
        scrollVelocityTarget = 0;
        cancelAnimationFrame(animationId);
        tick();
      } else {
        localStorage.setItem('bg-animation', 'disabled');
        toggleBtn.classList.add('disabled');
        canvas.classList.add('disabled');
        cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
  }
}
