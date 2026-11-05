const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelectorAll('.site-nav a');
const revealItems = document.querySelectorAll('.reveal');
const counters = document.querySelectorAll('[data-count]');
const form = document.querySelector('.inquiry-form');
const officeRows = document.querySelectorAll('.office-row[data-timezone]');

const syncHeader = () => header?.classList.toggle('scrolled', scrollY > 30);
syncHeader();
addEventListener('scroll', syncHeader, { passive: true });

menuToggle?.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});

navLinks.forEach((link) => link.addEventListener('click', () => {
  document.body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => revealObserver.observe(item));

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const item = entry.target;
    const target = Number(item.dataset.count);
    const prefix = item.dataset.prefix || '';
    const suffix = item.dataset.suffix || '';
    const start = performance.now();
    const animate = (time) => {
      const progress = Math.min((time - start) / 1100, 1);
      const value = target * (1 - Math.pow(1 - progress, 3));
      item.textContent = `${prefix}${target % 1 ? value.toFixed(1) : Math.round(value)}${suffix}`;
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    countObserver.unobserve(item);
  });
}, { threshold: 0.65 });

counters.forEach((counter) => countObserver.observe(counter));

const sunTrack = document.querySelector('.sun-track-bar');
const openCount = document.querySelector('.offices-open');
const sunMarkers = new Map();

officeRows.forEach((row) => {
  if (!sunTrack) return;
  const marker = document.createElement('span');
  marker.className = 'sun-marker';
  marker.innerHTML = `<i></i><b>${row.dataset.code}</b>`;
  sunTrack.append(marker);
  sunMarkers.set(row, marker);
  row.addEventListener('mouseenter', () => marker.classList.add('is-active'));
  row.addEventListener('mouseleave', () => marker.classList.remove('is-active'));
});

const updateOfficeClocks = () => {
  const now = new Date();
  let open = 0;
  officeRows.forEach((row) => {
    const timezone = row.dataset.timezone;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short'
    }).formatToParts(now);
    const part = (type) => parts.find((item) => item.type === type)?.value;
    const hour = Number(part('hour')) % 24;
    const minute = Number(part('minute'));
    const isOpen = hour >= 8 && hour < 18;
    if (isOpen) open += 1;

    row.querySelector('time').textContent = `${String(hour).padStart(2, '0')}:${part('minute')}`;
    const zoneLabel = row.querySelector('.office-zone');
    if (zoneLabel && part('timeZoneName')) zoneLabel.textContent = part('timeZoneName');
    row.querySelector('.office-status').textContent = isOpen ? 'In session' : 'After hours';
    row.classList.toggle('is-open', isOpen);

    const marker = sunMarkers.get(row);
    if (!marker) return;
    marker.dataset.position = ((hour * 60 + minute) / 1440) * 100;
    marker.style.left = `${marker.dataset.position}%`;
    marker.classList.toggle('is-open', isOpen);
  });

  // Alternate labels above/below the track so neighbouring offices don't collide
  [...sunMarkers.values()]
    .sort((a, b) => a.dataset.position - b.dataset.position)
    .forEach((marker, index) => {
      marker.classList.toggle('sun-marker-up', index % 2 === 0);
      marker.classList.toggle('sun-marker-down', index % 2 === 1);
    });

  if (openCount) openCount.textContent = open;
};

updateOfficeClocks();
setInterval(updateOfficeClocks, 30000);

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  const original = button.innerHTML;
  button.innerHTML = 'RECEIVED BY DDM <span>✓</span>';
  button.disabled = true;
  setTimeout(() => {
    form.reset();
    button.innerHTML = original;
    button.disabled = false;
  }, 2200);
});
