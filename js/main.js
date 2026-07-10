/**
 * STACKLY - Premium Fashion E-Commerce
 * Main JavaScript File
 * Vanilla JS only - No frameworks
 */

// ==========================================
// GLOBAL STATE
// ==========================================
const App = {
  scroll: { y: 0, velocity: 0, lastY: 0 },
  isLoggedIn: false,
  userRole: null,
  cart: [],
  animations: {},
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => context.querySelectorAll(selector);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const mapRange = (value, inMin, inMax, outMin, outMax) =>
  ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

// Throttle function
const throttle = (fn, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Debounce function
const debounce = (fn, delay) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

// Random integer
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
const Toast = {
  container: null,

  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(message, type = 'info', duration = 3000) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },

  success(message) {
    this.show(message, 'success');
  },

  error(message) {
    this.show(message, 'error');
  },

  warning(message) {
    this.show(message, 'warning');
  },
};

// ==========================================
// AUTHENTICATION SYSTEM
// ==========================================
const Auth = {
  init() {
    this.checkSession();
    this.setupForms();
  },

  // Check if user is logged in
  checkSession() {
    const session = localStorage.getItem('stackly_session');
    if (session) {
      try {
        const data = JSON.parse(session);
        App.isLoggedIn = true;
        App.userRole = data.role;
        this.updateUI(data);
      } catch (e) {
        this.logout();
      }
    }
  },

  // Update UI based on auth state
  updateUI(userData) {
    const nav = $('.navbar .container');
    if (!nav) return;

    // Keep the account link pointing to the login page instead of the dashboard
    const loginLink = nav.querySelector('a[href="login.html"]');
    if (loginLink) {
      loginLink.href = 'login.html';
      loginLink.setAttribute('aria-label', 'Login');
      loginLink.setAttribute('title', 'Login');
    }
  },

  // Setup login/register forms
  setupForms() {
    // Login form
    const loginForm = $('#loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = $('#loginEmail').value;
        const password = $('#loginPassword').value;
        const role = $('.role-option.active')?.dataset.role || 'user';

        // Demo login - accept any credentials
        const users = JSON.parse(localStorage.getItem('stackly_users') || '[]');
        const user = users.find((u) => u.email === email && u.password === password);

        if (user || (email && password)) {
          const sessionData = {
            email: email,
            role: user ? user.role : role,
            name: user ? user.name : email.split('@')[0],
            timestamp: Date.now(),
          };
          localStorage.setItem('stackly_session', JSON.stringify(sessionData));
          App.isLoggedIn = true;
          App.userRole = sessionData.role;

          Toast.success('Login successful!');
          setTimeout(() => {
            window.location.href = sessionData.role === 'admin' ? 'admin.html' : 'dashboard.html';
          }, 1000);
        } else {
          Toast.error('Invalid credentials!');
        }
      });
    }

    // Register form
    const registerForm = $('#registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#registerName').value;
        const email = $('#registerEmail').value;
        const password = $('#registerPassword').value;
        const confirmPassword = $('#registerConfirmPassword').value;
        const role = $('.role-option.active')?.dataset.role || 'user';

        if (password !== confirmPassword) {
          Toast.error('Passwords do not match!');
          return;
        }

        const users = JSON.parse(localStorage.getItem('stackly_users') || '[]');
        if (users.find((u) => u.email === email)) {
          Toast.error('Email already registered!');
          return;
        }

        users.push({ name, email, password, role, createdAt: Date.now() });
        localStorage.setItem('stackly_users', JSON.stringify(users));

        Toast.success('Registration successful! Please login.');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
      });
    }

    // Role selector
    $$('.role-option').forEach((option) => {
      option.addEventListener('click', () => {
        $$('.role-option').forEach((o) => o.classList.remove('active'));
        option.classList.add('active');
      });
    });
  },

  // Logout
  logout() {
    localStorage.removeItem('stackly_session');
    App.isLoggedIn = false;
    App.userRole = null;
    Toast.success('Logged out successfully!');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  },

  // Protect routes
  protectRoute(requiredRole) {
    const session = localStorage.getItem('stackly_session');
    if (!session) {
      window.location.href = 'login.html';
      return false;
    }

    const data = JSON.parse(session);
    if (requiredRole && data.role !== requiredRole) {
      window.location.href = 'index.html';
      return false;
    }

    return true;
  },
};

// ==========================================
// NAVIGATION
// ==========================================
const Navigation = {
  init() {
    this.setupScroll();
    this.setupMobileMenu();
    this.setupSmoothScroll();
    this.setupActivePage();
    this.setupBackButtons();
  },

  setupScroll() {
    const navbar = $('.navbar');
    if (!navbar) return;

    window.addEventListener(
      'scroll',
      throttle(() => {
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }, 100)
    );
  },

  setupMobileMenu() {
    const toggle = $('.menu-toggle');
    const mobileNav = $('.mobile-nav');
    const overlay = $('.mobile-overlay');

    if (!toggle || !mobileNav) return;

    toggle.addEventListener('click', () => {
      mobileNav.classList.toggle('active');
      overlay?.classList.toggle('active');
      toggle.classList.toggle('active');
    });

    overlay?.addEventListener('click', () => {
      mobileNav.classList.remove('active');
      overlay.classList.remove('active');
      toggle.classList.remove('active');
    });

    // Close on link click
    $$('.mobile-nav a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('active');
        overlay?.classList.remove('active');
        toggle.classList.remove('active');
      });
    });
  },

  setupSmoothScroll() {
    $$('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;

        const target = $(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  },

  setupActivePage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const normalizedCurrent = currentPage === '' ? 'index.html' : currentPage;

    $$('.nav-links a, .mobile-nav a').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      const linkPage = href.split('#')[0].split('?')[0] || 'index.html';
      const normalizedLink = linkPage.replace(/^\.\//, '');
      const isActive = normalizedLink === normalizedCurrent || (normalizedLink === 'index.html' && normalizedCurrent === 'index.html');

      link.classList.toggle('active', isActive);
    });
  },

  setupBackButtons() {
    $$('[data-go-back]').forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault();

        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = 'index.html';
        }
      });
    });
  },
};

// ==========================================
// AOS (Animate On Scroll) - Custom Implementation
// ==========================================
const AOS = {
  elements: [],
  observer: null,

  init() {
    this.elements = $$('[data-aos]');
    if (!this.elements.length) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('aos-animate');
            this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -80px 0px' }
    );

    this.elements.forEach((el) => this.observer.observe(el));
  },

  refresh() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.init();
  },
};

// ==========================================
// TEXT REVEAL ANIMATION
// ==========================================
const TextReveal = {
  init() {
    $$('.reveal-text').forEach((el) => {
      this.splitText(el);
    });

    this.setupObserver();
  },

  splitText(element) {
    const text = element.textContent;
    const words = text.split(' ');

    element.innerHTML = '';
    words.forEach((word) => {
      const mask = document.createElement('span');
      mask.className = 'word-mask';

      const inner = document.createElement('span');
      inner.className = 'word-inner';
      inner.textContent = word + '\u00A0';

      mask.appendChild(inner);
      element.appendChild(mask);
    });
  },

  setupObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    $$('.reveal-text').forEach((el) => observer.observe(el));
  },
};

// ==========================================
// HERO VELOCITY CAROUSEL
// ==========================================
const HeroCarousel = {
  rows: [],
  speed: 0,
  targetSpeed: 0,
  rafId: null,

  init() {
    const heroVisuals = $('.hero-visuals');
    if (!heroVisuals) return;

    this.rows = $$('.hero-row');
    if (!this.rows.length) return;

    // Clone images for infinite loop
    this.rows.forEach((row) => {
      const images = row.querySelectorAll('img');
      images.forEach((img) => {
        const clone = img.cloneNode(true);
        row.appendChild(clone);
      });
    });

    this.bindScroll();
    this.animate();
  },

  bindScroll() {
    window.addEventListener('scroll', () => {
      const currentY = window.scrollY;
      App.scroll.velocity = currentY - App.scroll.lastY;
      App.scroll.lastY = currentY;

      // Decay velocity
      this.targetSpeed = App.scroll.velocity * 2;
    });
  },

  animate() {
    this.speed = lerp(this.speed, this.targetSpeed, 0.1);
    this.targetSpeed *= 0.95; // Decay

    this.rows.forEach((row, i) => {
      const currentX = parseFloat(row.dataset.x || '0');
      const direction = i % 2 === 0 ? 1 : -1;
      const speedMultiplier = i === 1 ? 0.5 : 1;
      const newX = currentX + this.speed * direction * speedMultiplier;

      // Wrap around
      const totalWidth = row.scrollWidth / 2;
      let wrappedX = newX % totalWidth;
      if (wrappedX > 0) wrappedX -= totalWidth;

      row.dataset.x = wrappedX;
      row.style.transform = `translateX(${wrappedX}px)`;
    });

    this.rafId = requestAnimationFrame(() => this.animate());
  },

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  },
};

// ==========================================
// KINETIC TEXT BLUR
// ==========================================
const KineticText = {
  chars: [],
  rafId: null,

  init() {
    this.chars = $$('.hero-title .char');
    if (!this.chars.length) return;

    this.animate();
  },

  animate() {
    const speed = App.scroll.velocity;
    const blurAmount = Math.min(Math.abs(speed) * 0.5, 5);
    const skewAmount = -speed * 0.5;

    this.chars.forEach((char, i) => {
      const delay = i * 0.02;
      char.style.filter = `blur(${blurAmount}px)`;
      char.style.transform = `skewX(${skewAmount}deg)`;
      char.style.transition = `filter 0.1s, transform 0.1s`;
    });

    this.rafId = requestAnimationFrame(() => this.animate());
  },

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  },
};

// ==========================================
// FAQ ACCORDION
// ==========================================
const FAQ = {
  init() {
    $$('.faq-question').forEach((question) => {
      question.addEventListener('click', () => {
        const item = question.closest('.faq-item');
        const isActive = item.classList.contains('active');

        // Close all
        $$('.faq-item').forEach((i) => i.classList.remove('active'));

        // Open clicked if wasn't active
        if (!isActive) {
          item.classList.add('active');
        }
      });
    });
  },
};

// ==========================================
// 3D CAROUSEL
// ==========================================
const Carousel3D = {
  carousel: null,
  cards: [],
  rotation: 0,
  isDragging: false,
  startX: 0,
  currentRotation: 0,
  rafId: null,

  init() {
    this.carousel = $('.carousel-3d');
    if (!this.carousel) return;

    this.cards = $$('.carousel-card');
    this.positionCards();
    this.bindEvents();
    this.animate();
  },

  positionCards() {
    const totalCards = this.cards.length;
    const radius = 400;

    this.cards.forEach((card, i) => {
      const angle = (360 / totalCards) * i;
      card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
    });
  },

  bindEvents() {
    const wrapper = $('.carousel-3d-wrapper');
    if (!wrapper) return;

    wrapper.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.startX = e.clientX;
      this.currentRotation = this.rotation;
      wrapper.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const delta = e.clientX - this.startX;
      this.rotation = this.currentRotation + delta * 0.3;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      if (wrapper) wrapper.style.cursor = 'grab';
    });

    // Touch events
    wrapper.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      this.startX = e.touches[0].clientX;
      this.currentRotation = this.rotation;
    });

    wrapper.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return;
      const delta = e.touches[0].clientX - this.startX;
      this.rotation = this.currentRotation + delta * 0.3;
    });

    wrapper.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  },

  animate() {
    if (!this.isDragging) {
      this.rotation += 0.15;
    }

    if (this.carousel) {
      this.carousel.style.transform = `rotateY(${this.rotation}deg)`;
    }

    this.rafId = requestAnimationFrame(() => this.animate());
  },

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  },
};

// ==========================================
// LOADING SCREEN
// ==========================================
const LoadingScreen = {
  init() {
    const loader = $('.loading-screen');
    if (!loader) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        loader.classList.add('hidden');
      }, 1500);
    });

    // Fallback
    setTimeout(() => {
      loader?.classList.add('hidden');
    }, 3000);
  },
};

// ==========================================
// PARALLAX EFFECTS
// ==========================================
const Parallax = {
  elements: [],

  init() {
    this.elements = $$('[data-parallax]');
    if (!this.elements.length) return;

    window.addEventListener('scroll', () => this.update());
  },

  update() {
    const scrollY = window.scrollY;

    this.elements.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.5;
      const rect = el.getBoundingClientRect();
      const offset = (scrollY - el.offsetTop) * speed;

      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.style.transform = `translateY(${offset}px)`;
      }
    });
  },
};

// ==========================================
// COUNTER ANIMATION
// ==========================================
const Counter = {
  init() {
    const counters = $$('[data-counter]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animate(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((counter) => observer.observe(counter));
  },

  animate(element) {
    const target = parseInt(element.dataset.counter);
    const suffix = element.dataset.suffix || '';
    const duration = 2000;
    const start = performance.now();

    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.floor(eased * target);

      element.textContent = current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = target.toLocaleString() + suffix;
      }
    };

    requestAnimationFrame(update);
  },
};

// ==========================================
// CUSTOM CURSOR
// ==========================================
const CustomCursor = {
  cursor: null,
  target: null,

  init() {
    // Skip on touch devices
    if ('ontouchstart' in window) return;

    this.cursor = $('.custom-cursor');
    this.target = $('.carousel-3d-wrapper');

    if (!this.cursor || !this.target) return;

    this.target.addEventListener('mouseenter', () => {
      this.cursor.classList.add('active');
    });

    this.target.addEventListener('mouseleave', () => {
      this.cursor.classList.remove('active');
    });

    this.target.addEventListener('mousemove', (e) => {
      const rect = this.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.cursor.style.left = x - 40 + 'px';
      this.cursor.style.top = y - 40 + 'px';
    });
  },
};

// ==========================================
// PAGE TRANSITION
// ==========================================
const PageTransition = {
  init() {
    $$('a[href$=".html"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return;

        e.preventDefault();
        this.transition(href);
      });
    });
  },

  transition(href) {
    const overlay = $('.page-transition');
    if (!overlay) {
      window.location.href = href;
      return;
    }

    overlay.classList.add('active');

    setTimeout(() => {
      window.location.href = href;
    }, 300);
  },
};

// ==========================================
// DASHBOARD FUNCTIONS
// ==========================================
const Dashboard = {
  init() {
    this.loadUserData();
    this.setupNavigation();
    this.renderCharts();
    this.populateTables();
  },

  loadUserData() {
    const session = localStorage.getItem('stackly_session');
    if (!session) return;

    const data = JSON.parse(session);
    const userNameEl = $('#dashboardUserName');
    const userRoleEl = $('#dashboardUserRole');
    const userAvatarEl = $('#dashboardUserAvatar');

    if (userNameEl) userNameEl.textContent = data.name || 'User';
    if (userRoleEl) userRoleEl.textContent = data.role || 'user';
    if (userAvatarEl) userAvatarEl.textContent = (data.name || 'U')[0].toUpperCase();
  },

  setupNavigation() {
    const toggle = $('.dashboard-toggle-btn');
    const sidebar = $('.dashboard-sidebar');

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        toggle.classList.toggle('active');
      });
    }

    $$('.dashboard-nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;

        $$('.dashboard-nav-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');

        $$('.dashboard-section').forEach((s) => (s.style.display = 'none'));
        const targetSection = $(`#${section}`);
        if (targetSection) {
          targetSection.style.display = 'block';
          // Re-trigger AOS
          AOS.refresh();
        }

        if (window.innerWidth <= 768) {
          sidebar?.classList.add('collapsed');
          toggle?.classList.remove('active');
        }
      });
    });

    // Show first section by default
    const firstSection = $('.dashboard-section');
    if (firstSection) firstSection.style.display = 'block';
  },

  renderCharts() {
    // Bar chart animation
    $$('.admin-chart-bar-item').forEach((bar, i) => {
      setTimeout(() => {
        bar.style.height = bar.style.height;
      }, i * 100);
    });
  },

  populateTables() {
    // Populate orders table with demo data
    const ordersTable = $('#ordersTable tbody');
    if (ordersTable) {
      const demoOrders = [
        { id: '#ORD-001', customer: 'John Doe', date: '2026-07-01', total: 245.0, status: 'completed' },
        { id: '#ORD-002', customer: 'Jane Smith', date: '2026-07-02', total: 189.5, status: 'pending' },
        { id: '#ORD-003', customer: 'Mike Johnson', date: '2026-07-03', total: 456.0, status: 'completed' },
        { id: '#ORD-004', customer: 'Sarah Williams', date: '2026-07-04', total: 78.99, status: 'cancelled' },
        { id: '#ORD-005', customer: 'David Brown', date: '2026-07-05', total: 329.0, status: 'completed' },
      ];

      ordersTable.innerHTML = demoOrders
        .map(
          (order) => `
        <tr>
          <td>${order.id}</td>
          <td>${order.customer}</td>
          <td>${order.date}</td>
          <td>$${order.total.toFixed(2)}</td>
          <td><span class="status-badge ${order.status}">${order.status}</span></td>
        </tr>
      `
        )
        .join('');
    }

    // Populate users table for admin
    const usersTable = $('#usersTable tbody');
    if (usersTable) {
      const users = JSON.parse(localStorage.getItem('stackly_users') || '[]');
      const defaultUsers = [
        { name: 'Admin User', email: 'admin@stackly.com', role: 'admin', createdAt: Date.now() - 86400000 * 30 },
        { name: 'Demo User', email: 'user@stackly.com', role: 'user', createdAt: Date.now() - 86400000 * 15 },
      ];

      const allUsers = users.length > 0 ? users : defaultUsers;

      usersTable.innerHTML = allUsers
        .map(
          (user) => `
        <tr>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td><span class="status-badge ${user.role === 'admin' ? 'completed' : 'pending'}">${user.role}</span></td>
          <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        </tr>
      `
        )
        .join('');
    }
  },
};

// ==========================================
// BACK TO TOP
// ==========================================
const BackToTop = {
  init() {
    const btn = $('#backToTop');
    if (!btn) return;

    window.addEventListener(
      'scroll',
      throttle(() => {
        if (window.scrollY > 500) {
          btn.style.opacity = '1';
          btn.style.visibility = 'visible';
        } else {
          btn.style.opacity = '0';
          btn.style.visibility = 'hidden';
        }
      }, 100)
    );

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },
};

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================
const Search = {
  init() {
    const searchToggle = $('#searchToggle');
    const searchOverlay = $('#searchOverlay');
    const searchClose = $('#searchClose');
    const searchInput = $('#searchInput');

    if (!searchToggle || !searchOverlay) return;

    searchToggle.addEventListener('click', () => {
      searchOverlay.classList.add('active');
      setTimeout(() => searchInput?.focus(), 300);
    });

    searchClose?.addEventListener('click', () => {
      searchOverlay.classList.remove('active');
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchOverlay?.classList.remove('active');
      }
    });
  },
};

// ==========================================
// CART FUNCTIONALITY
// ==========================================
const Cart = {
  init() {
    this.loadCart();
    this.updateBadge();
  },

  loadCart() {
    const cart = localStorage.getItem('stackly_cart');
    if (cart) {
      App.cart = JSON.parse(cart);
    }
  },

  addItem(item) {
    const existing = App.cart.find((i) => i.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      App.cart.push({ ...item, quantity: 1 });
    }
    this.saveCart();
    this.updateBadge();
    Toast.success('Item added to cart!');
  },

  removeItem(id) {
    App.cart = App.cart.filter((i) => i.id !== id);
    this.saveCart();
    this.updateBadge();
  },

  saveCart() {
    localStorage.setItem('stackly_cart', JSON.stringify(App.cart));
  },

  updateBadge() {
    const badge = $('.nav-badge');
    const count = App.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) {
      badge.style.display = count > 0 ? 'block' : 'none';
    }
  },

  getTotal() {
    return App.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
};

// ==========================================
// NEWSLETTER
// ==========================================
const Newsletter = {
  init() {
    const form = $('#newsletterForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]')?.value;

      if (email) {
        // Store subscription
        const subscribers = JSON.parse(localStorage.getItem('stackly_subscribers') || '[]');
        if (!subscribers.includes(email)) {
          subscribers.push(email);
          localStorage.setItem('stackly_subscribers', JSON.stringify(subscribers));
        }

        Toast.success('Thank you for subscribing!');
        form.reset();
      }
    });
  },
};

// ==========================================
// CONTACT FORM
// ==========================================
const ContactForm = {
  init() {
    const form = $('#contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      // Store message
      const messages = JSON.parse(localStorage.getItem('stackly_messages') || '[]');
      messages.push({ ...data, timestamp: Date.now() });
      localStorage.setItem('stackly_messages', JSON.stringify(messages));

      Toast.success('Message sent successfully!');
      form.reset();
      setTimeout(() => {
        window.location.href = '404.html';
      }, 500);
    });
  },
};

// ==========================================
// ANIMATE ON SCROLL - GSAP-like effects
// ==========================================
const ScrollAnimations = {
  init() {
    this.setupFadeIns();
    this.setupParallaxImages();
  },

  setupFadeIns() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    $$('.fade-in').forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      observer.observe(el);
    });
  },

  setupParallaxImages() {
    $$('.parallax-img').forEach((img) => {
      const parent = img.parentElement;
      parent.style.overflow = 'hidden';

      window.addEventListener(
        'scroll',
        throttle(() => {
          const rect = parent.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
            const translateY = (progress - 0.5) * 40;
            img.style.transform = `translateY(${translateY}px) scale(1.1)`;
          }
        }, 50)
      );
    });
  },
};

// ==========================================
// GLITCH TEXT EFFECT
// ==========================================
const GlitchText = {
  chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',

  init() {
    $$('[data-glitch]').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        this.animate(el);
      });
    });
  },

  animate(element) {
    const originalText = element.dataset.glitch || element.textContent;
    let iterations = 0;

    const interval = setInterval(() => {
      element.textContent = originalText
        .split('')
        .map((char, i) => {
          if (i < iterations) return originalText[i];
          return this.chars[Math.floor(Math.random() * this.chars.length)];
        })
        .join('');

      iterations += 1 / 2;

      if (iterations >= originalText.length) {
        clearInterval(interval);
        element.textContent = originalText;
      }
    }, 30);
  },
};

// ==========================================
// MAGNETIC BUTTON EFFECT
// ==========================================
const MagneticButton = {
  init() {
    // Skip on touch devices
    if ('ontouchstart' in window) return;

    $$('.btn-magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0, 0)';
      });
    });
  },
};

// ==========================================
// MARQUEE SPEED ON SCROLL
// ==========================================
const MarqueeScroll = {
  init() {
    const marquee = $('.marquee-track');
    if (!marquee) return;

    window.addEventListener(
      'scroll',
      throttle(() => {
        const velocity = Math.abs(App.scroll.velocity);
        const speed = Math.max(20 - velocity * 0.5, 5);
        marquee.style.animationDuration = speed + 's';
      }, 100)
    );
  },
};

// ==========================================
// MAIN INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize utilities
  Toast.init();

  // Initialize auth
  Auth.init();

  // Initialize navigation
  Navigation.init();

  // Initialize loading screen
  LoadingScreen.init();

  // Initialize AOS
  AOS.init();

  // Initialize text reveal
  TextReveal.init();

  // Initialize hero effects
  HeroCarousel.init();
  KineticText.init();

  // Initialize FAQ
  FAQ.init();

  // Initialize 3D carousel
  Carousel3D.init();

  // Initialize parallax
  Parallax.init();

  // Initialize counters
  Counter.init();

  // Initialize custom cursor
  CustomCursor.init();

  // Initialize page transitions
  PageTransition.init();

  // Initialize back to top
  BackToTop.init();

  // Initialize search
  Search.init();

  // Initialize cart
  Cart.init();

  // Initialize newsletter
  Newsletter.init();

  // Initialize contact form
  ContactForm.init();

  // Initialize scroll animations
  ScrollAnimations.init();

  // Initialize glitch text
  GlitchText.init();

  // Initialize magnetic buttons
  MagneticButton.init();

  // Initialize marquee scroll effect
  MarqueeScroll.init();

  // Initialize dashboard if on dashboard page
  if (document.querySelector('.dashboard')) {
    Dashboard.init();
  }

  // Setup logout buttons
  $$('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', () => Auth.logout());
  });

  // Protect admin routes
  if (document.body.classList.contains('admin-page')) {
    Auth.protectRoute('admin');
  }

  // Protect user routes
  if (document.body.classList.contains('dashboard-page')) {
    Auth.protectRoute('user');
  }

  console.log('Stackly initialized successfully!');
});

// ==========================================
// CLEANUP ON PAGE UNLOAD
// ==========================================
window.addEventListener('beforeunload', () => {
  HeroCarousel.destroy();
  KineticText.destroy();
  Carousel3D.destroy();
});
