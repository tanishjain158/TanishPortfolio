document.addEventListener('DOMContentLoaded', function () {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var navbar = document.querySelector('.navbar');
    var scrollUpBtn = document.querySelector('.scroll-up-btn');
    var menu = document.getElementById('menu');
    var menuBtn = document.querySelector('.menu-btn');
    var menuIcon = menuBtn.querySelector('i');
    var navLinks = menu.querySelectorAll('a');

    // sticky navbar + scroll-up button
    function onScroll() {
        var y = window.scrollY;
        navbar.classList.toggle('sticky', y > 20);
        scrollUpBtn.classList.toggle('show', y > 500);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    scrollUpBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    // mobile menu
    function setMenu(open) {
        menu.classList.toggle('active', open);
        document.body.classList.toggle('menu-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menuIcon.className = open ? 'fas fa-times' : 'fas fa-bars';
    }
    menuBtn.addEventListener('click', function () {
        setMenu(!menu.classList.contains('active'));
    });
    navLinks.forEach(function (link) {
        link.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menu.classList.contains('active')) {
            setMenu(false);
            menuBtn.focus();
        }
    });

    // typing text animation
    var typingEl = document.querySelector('.typing');
    if (typingEl && window.Typed && !reduceMotion) {
        typingEl.textContent = '';
        new Typed('.typing', {
            strings: ['Java Developer', 'Web Developer', 'Full Stack Developer', 'Project Manager', 'Singer'],
            typeSpeed: 100,
            backSpeed: 60,
            backDelay: 1500,
            loop: true
        });
    }

    // footer year
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // contact form -> pre-filled email in the visitor's mail app
    var form = document.querySelector('.contact-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var data = new FormData(form);
            var body = data.get('message') + '\n\n' + data.get('name') + '\n' + data.get('email');
            window.location.href = 'mailto:tanishharsh158@gmail.com' +
                '?subject=' + encodeURIComponent(data.get('subject')) +
                '&body=' + encodeURIComponent(body);
            form.querySelector('.form-note').textContent = 'Your email app should open now. If it doesn\'t, email tanishharsh158@gmail.com directly.';
        });
    }

    var revealEls = document.querySelectorAll('.reveal');
    var bars = document.querySelector('.bars');

    if (!('IntersectionObserver' in window)) {
        revealEls.forEach(function (el) { el.classList.add('visible'); });
        if (bars) bars.classList.add('in-view');
        return;
    }

    // reveal sections as they scroll into view (staggered within a batch)
    var revealObserver = new IntersectionObserver(function (entries) {
        var i = 0;
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.style.animationDelay = (i++ * 90) + 'ms';
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });

    // fill skill bars when they become visible
    if (bars) {
        var barsObserver = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                bars.classList.add('in-view');
                barsObserver.disconnect();
            }
        }, { threshold: 0.3 });
        barsObserver.observe(bars);
    }

    // highlight the nav link for the section in view
    var sections = document.querySelectorAll('main section[id]');
    var sectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            navLinks.forEach(function (link) {
                link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
            });
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (section) { sectionObserver.observe(section); });
});
