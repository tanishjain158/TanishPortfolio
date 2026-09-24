document.addEventListener('DOMContentLoaded', function () {
    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var navbar = document.querySelector('.navbar');
    var progressBar = document.querySelector('.progress span');
    var scrollUpBtn = document.querySelector('.scroll-up-btn');
    var menu = document.getElementById('menu');
    var menuBtn = document.querySelector('.menu-btn');
    var navLinks = menu.querySelectorAll('a');

    // sticky navbar, reading progress, scroll-up button
    function onScroll() {
        var y = window.scrollY;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        navbar.classList.toggle('sticky', y > 20);
        scrollUpBtn.classList.toggle('show', y > 500);
        progressBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    scrollUpBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    // light / dark theme
    var themeBtn = document.querySelector('.theme-toggle');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    function currentTheme() {
        return root.getAttribute('data-theme') || (systemDark.matches ? 'dark' : 'light');
    }
    function syncThemeButton() {
        var dark = currentTheme() === 'dark';
        themeBtn.querySelector('i').className = dark ? 'fas fa-sun' : 'fas fa-moon';
        themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
    themeBtn.addEventListener('click', function () {
        var next = currentTheme() === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        syncThemeButton();
    });
    if (systemDark.addEventListener) systemDark.addEventListener('change', syncThemeButton);
    syncThemeButton();

    // mobile menu
    function setMenu(open) {
        menu.classList.toggle('active', open);
        document.body.classList.toggle('menu-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menuBtn.querySelector('i').className = open ? 'fas fa-times' : 'fas fa-bars';
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
            typeSpeed: 90,
            backSpeed: 50,
            backDelay: 1600,
            loop: true
        });
    }

    // certificate lightbox
    var certs = {
        unicompiler: { src: 'images/certificates/unicompiler.jpg', title: 'UNIcompiler: Web Development & Design Internship' },
        axiom: { src: 'images/certificates/axiom-cloud.jpg', title: 'Axiom Cloud Solutions: Certificate of Internship' },
        linkedin: { src: 'images/certificates/linkedin-frontend.jpg', title: 'LinkedIn Learning: Explore a Career in Front-End Web Development' }
    };
    var lightbox = document.querySelector('.lightbox');
    if (lightbox && typeof lightbox.showModal === 'function') {
        var lbImg = lightbox.querySelector('.lightbox-img');
        var lbTitle = lightbox.querySelector('#lightbox-title');
        document.querySelectorAll('[data-cert]').forEach(function (trigger) {
            trigger.addEventListener('click', function (e) {
                var cert = certs[trigger.getAttribute('data-cert')];
                if (!cert) return;
                e.preventDefault();
                lbImg.src = cert.src;
                lbImg.alt = cert.title + ' certificate';
                lbTitle.textContent = cert.title;
                lightbox.showModal();
            });
        });
        lightbox.querySelector('.lightbox-close').addEventListener('click', function () { lightbox.close(); });
        // click on the backdrop closes it
        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox) lightbox.close();
        });
    } else {
        // no <dialog> support: the buttons in the timeline fall back to opening the image
        document.querySelectorAll('button[data-cert]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var cert = certs[btn.getAttribute('data-cert')];
                if (cert) window.open(cert.src, '_blank', 'noopener');
            });
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

    // count-up numbers in the stats row
    function countUp(el) {
        var target = parseInt(el.getAttribute('data-count'), 10);
        if (reduceMotion || !target) return;
        var start = null;
        el.textContent = '0';
        function step(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / 1200, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    var revealEls = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
        revealEls.forEach(function (el) { el.classList.add('visible'); });
        return;
    }

    // reveal elements as they scroll into view (staggered within a batch)
    var revealObserver = new IntersectionObserver(function (entries) {
        var i = 0;
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.style.animationDelay = (i++ * 90) + 'ms';
            entry.target.classList.add('visible');
            entry.target.querySelectorAll('[data-count]').forEach(countUp);
            revealObserver.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });

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
