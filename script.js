/* Tanish Jain · Portfolio interactions (vanilla JS, no dependencies) */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var hasIO = 'IntersectionObserver' in window;
    var EMAIL = 'tanishharsh158@gmail.com';

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
    function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

    /* ---------------------------------------------------------------
       Toast
       --------------------------------------------------------------- */
    var toastEl = $('.toast');
    var toastTimer;
    function toast(message) {
        toastEl.innerHTML = '<i class="fas fa-check-circle" aria-hidden="true"></i>' + message;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
    }

    function copyText(text, label) {
        function done() { toast(label + ' copied to clipboard'); }
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done, fallback);
        } else {
            fallback();
        }
        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed: ' + text); }
            document.body.removeChild(ta);
        }
    }

    /* ---------------------------------------------------------------
       Text splitting (hero letters + section heading words)
       --------------------------------------------------------------- */
    var charIndex = 0;
    $$('[data-split]').forEach(function (el) {
        var text = el.textContent;
        var label = document.createElement('span');
        label.className = 'visually-hidden';
        label.textContent = text;
        el.parentNode.insertBefore(label, el);
        el.setAttribute('aria-hidden', 'true');
        el.textContent = '';
        Array.prototype.forEach.call(text, function (ch, i) {
            var span = document.createElement('span');
            span.className = 'char';
            span.textContent = ch;
            span.style.setProperty('--i', charIndex++);
            span.style.setProperty('--i2', i);
            span.style.setProperty('--n', text.length);
            el.appendChild(span);
        });
    });

    $$('[data-split-words]').forEach(function (el) {
        var words = el.textContent.trim().split(/\s+/);
        el.textContent = '';
        words.forEach(function (word, i) {
            var outer = document.createElement('span');
            outer.className = 'w';
            var inner = document.createElement('span');
            inner.className = 'wi' + (i === words.length - 1 ? ' grad-word' : '');
            inner.style.setProperty('--i', i);
            inner.textContent = word;
            outer.appendChild(inner);
            el.appendChild(outer);
            if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        });
    });

    /* ---------------------------------------------------------------
       Count-up numbers
       --------------------------------------------------------------- */
    function formatNumber(n, decimals, comma) {
        var s = n.toFixed(decimals);
        return comma ? Number(s).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : s;
    }
    function countUp(el) {
        if (el.dataset.counted) return;
        el.dataset.counted = '1';
        var target = parseFloat(el.dataset.count);
        var decimals = parseInt(el.dataset.decimals || '0', 10);
        var comma = el.dataset.format === 'comma';
        if (reduceMotion || isNaN(target)) return;
        var start = null;
        var duration = 1800;
        el.textContent = formatNumber(0, decimals, comma);
        function step(ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 4);
            el.textContent = formatNumber(target * eased, decimals, comma);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* ---------------------------------------------------------------
       Reveal on scroll (staggered per batch)
       --------------------------------------------------------------- */
    var revealEls = $$('[data-reveal]');
    function revealNow(el) {
        el.classList.add('in');
        $$('[data-count]', el).forEach(countUp);
    }
    if (hasIO && !reduceMotion) {
        var revealIO = new IntersectionObserver(function (entries) {
            var batch = entries.filter(function (e) { return e.isIntersecting; });
            batch.forEach(function (entry, i) {
                entry.target.style.setProperty('--rd', (i * 110) + 'ms');
                revealNow(entry.target);
                revealIO.unobserve(entry.target);
            });
        }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });
        revealEls.forEach(function (el) { revealIO.observe(el); });
    } else {
        revealEls.forEach(revealNow);
    }

    /* ---------------------------------------------------------------
       Typewriter
       --------------------------------------------------------------- */
    var typer = $('.typer');
    if (typer && !reduceMotion) {
        var words = JSON.parse(typer.dataset.words);
        var w = 0;
        var c = words[0].length;
        var deleting = true;
        var firstPause = true;
        (function tick() {
            var word = words[w];
            var delay;
            if (firstPause) {
                firstPause = false;
                delay = 2600;
            } else if (deleting) {
                c--;
                typer.textContent = word.slice(0, c);
                delay = 45;
                if (c === 0) {
                    deleting = false;
                    w = (w + 1) % words.length;
                    delay = 350;
                }
            } else {
                c++;
                typer.textContent = words[w].slice(0, c);
                delay = 85 + Math.random() * 60;
                if (c === words[w].length) {
                    deleting = true;
                    delay = 2000;
                }
            }
            setTimeout(tick, delay);
        })();
    }

    /* ---------------------------------------------------------------
       Hero: particle constellation (canvas)
       --------------------------------------------------------------- */
    var hero = $('.hero');
    var heroVisible = true;
    var canvas = $('.hero-canvas');
    var pointer = { x: -9999, y: -9999 };

    if (canvas && canvas.getContext) {
        var ctx = canvas.getContext('2d');
        var W = 0, H = 0, particles = [];

        var resizeCanvas = function () {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = canvas.clientWidth;
            H = canvas.clientHeight;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            var count = Math.round(clamp(W * H / 12000, 30, 120));
            particles = [];
            for (var i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    vx: (Math.random() - 0.5) * 0.35,
                    vy: (Math.random() - 0.5) * 0.35,
                    r: Math.random() * 1.6 + 0.6,
                    warm: Math.random() < 0.35
                });
            }
        };

        var drawFrame = function () {
            ctx.clearRect(0, 0, W, H);
            var linkDist = 118;
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                if (!reduceMotion) {
                    var dx = p.x - pointer.x;
                    var dy = p.y - pointer.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 150 * 150 && d2 > 0.01) {
                        var d = Math.sqrt(d2);
                        var force = (1 - d / 150) * 0.6;
                        p.x += (dx / d) * force;
                        p.y += (dy / d) * force;
                    }
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < -10) p.x = W + 10;
                    if (p.x > W + 10) p.x = -10;
                    if (p.y < -10) p.y = H + 10;
                    if (p.y > H + 10) p.y = -10;
                }
                for (var j = i + 1; j < particles.length; j++) {
                    var q = particles[j];
                    var lx = p.x - q.x;
                    var ly = p.y - q.y;
                    var ld = lx * lx + ly * ly;
                    if (ld < linkDist * linkDist) {
                        var a = (1 - Math.sqrt(ld) / linkDist) * 0.28;
                        ctx.strokeStyle = 'rgba(255, 120, 145, ' + a + ')';
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.stroke();
                    }
                }
                var mx = p.x - pointer.x;
                var my = p.y - pointer.y;
                var md = Math.sqrt(mx * mx + my * my);
                if (md < 200) {
                    ctx.strokeStyle = 'rgba(255, 170, 120, ' + ((1 - md / 200) * 0.45) + ')';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(pointer.x, pointer.y);
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.fillStyle = p.warm ? 'rgba(255, 170, 120, 0.9)' : 'rgba(255, 110, 140, 0.9)';
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        var canvasLoop = function () {
            if (heroVisible && !document.hidden) drawFrame();
            requestAnimationFrame(canvasLoop);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        if (reduceMotion) drawFrame();
        else requestAnimationFrame(canvasLoop);
    }

    if (hero) {
        if (hasIO) {
            new IntersectionObserver(function (entries) {
                heroVisible = entries[0].isIntersecting;
            }).observe(hero);
        }
        hero.addEventListener('pointermove', function (e) {
            var r = hero.getBoundingClientRect();
            pointer.x = e.clientX - r.left;
            pointer.y = e.clientY - r.top;
            hero.style.setProperty('--sx', pointer.x + 'px');
            hero.style.setProperty('--sy', pointer.y + 'px');
        });
        hero.addEventListener('pointerleave', function () {
            pointer.x = -9999;
            pointer.y = -9999;
        });
    }

    /* ---------------------------------------------------------------
       Hero: 3D rotating tech globe
       --------------------------------------------------------------- */
    var globeEl = $('.globe');
    if (globeEl) {
        var tags = JSON.parse(globeEl.dataset.tags);
        var n = tags.length;
        var points = tags.map(function (tag, i) {
            var phi = Math.acos(-1 + (2 * i + 1) / n);
            var theta = Math.sqrt(n * Math.PI) * phi;
            var span = document.createElement('span');
            span.className = 'globe-tag';
            span.textContent = tag;
            globeEl.appendChild(span);
            return {
                el: span,
                x: Math.cos(theta) * Math.sin(phi),
                y: Math.sin(theta) * Math.sin(phi),
                z: Math.cos(phi)
            };
        });
        var speedX = 0.0022, speedY = 0.0038;
        var targetX = speedX, targetY = speedY;

        var renderGlobe = function () {
            var R = globeEl.clientWidth * 0.44;
            speedX += (targetX - speedX) * 0.05;
            speedY += (targetY - speedY) * 0.05;
            var cosX = Math.cos(speedX), sinX = Math.sin(speedX);
            var cosY = Math.cos(speedY), sinY = Math.sin(speedY);
            for (var i = 0; i < points.length; i++) {
                var p = points[i];
                if (!reduceMotion) {
                    // rotate around X, then Y
                    var y1 = p.y * cosX - p.z * sinX;
                    var z1 = p.y * sinX + p.z * cosX;
                    var x2 = p.x * cosY + z1 * sinY;
                    var z2 = -p.x * sinY + z1 * cosY;
                    p.x = x2; p.y = y1; p.z = z2;
                }
                var depth = (p.z + 1) / 2;              // 0 (back) → 1 (front)
                var scale = 0.55 + depth * 0.65;
                p.el.style.transform = 'translate(-50%, -50%) translate3d(' + (p.x * R).toFixed(1) + 'px,' + (p.y * R).toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ')';
                p.el.style.opacity = (0.18 + depth * 0.82).toFixed(3);
                p.el.style.zIndex = Math.round(depth * 100);
                p.el.classList.toggle('hot', depth > 0.82);
            }
        };

        var globeLoop = function () {
            if (heroVisible && !document.hidden) renderGlobe();
            requestAnimationFrame(globeLoop);
        };
        renderGlobe();
        if (!reduceMotion) {
            requestAnimationFrame(globeLoop);
            var visual = $('.hero-visual');
            window.addEventListener('pointermove', function (e) {
                if (!heroVisible) return;
                var r = visual.getBoundingClientRect();
                var nx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width), -1, 1);
                var ny = clamp((e.clientY - (r.top + r.height / 2)) / (r.height), -1, 1);
                targetY = 0.0038 + nx * 0.012;
                targetX = 0.0022 - ny * 0.012;
            }, { passive: true });
        }
    }

    /* ---------------------------------------------------------------
       Custom cursor, magnetic buttons, 3D tilt cards
       --------------------------------------------------------------- */
    if (finePointer && !reduceMotion) {
        root.classList.add('has-cursor');
        var dot = $('.cursor-dot');
        var ring = $('.cursor-ring');
        var cx = -100, cy = -100, rx = -100, ry = -100;
        window.addEventListener('pointermove', function (e) {
            cx = e.clientX;
            cy = e.clientY;
            dot.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
            root.classList.remove('cursor-hidden');
        }, { passive: true });
        (function ringLoop() {
            rx += (cx - rx) * 0.18;
            ry += (cy - ry) * 0.18;
            ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
            requestAnimationFrame(ringLoop);
        })();
        document.addEventListener('pointerover', function (e) {
            ring.classList.toggle('hover', !!e.target.closest('a, button, input, textarea, .tilt, [data-cert]'));
        });
        document.addEventListener('pointerdown', function () { ring.classList.add('down'); });
        document.addEventListener('pointerup', function () { ring.classList.remove('down'); });
        document.documentElement.addEventListener('pointerleave', function () { root.classList.add('cursor-hidden'); });

        $$('.magnetic').forEach(function (el) {
            el.addEventListener('pointermove', function (e) {
                var r = el.getBoundingClientRect();
                var dx = e.clientX - (r.left + r.width / 2);
                var dy = e.clientY - (r.top + r.height / 2);
                el.style.translate = (dx * 0.25).toFixed(1) + 'px ' + (dy * 0.35).toFixed(1) + 'px';
            });
            el.addEventListener('pointerleave', function () { el.style.translate = ''; });
        });

        $$('.tilt').forEach(function (el) {
            el.addEventListener('pointermove', function (e) {
                var r = el.getBoundingClientRect();
                var px = (e.clientX - r.left) / r.width;
                var py = (e.clientY - r.top) / r.height;
                var max = r.width > 560 ? 3 : 7;
                el.classList.add('tilting');
                el.style.setProperty('--ry', ((px - 0.5) * max * 2).toFixed(2) + 'deg');
                el.style.setProperty('--rx', ((0.5 - py) * max * 2).toFixed(2) + 'deg');
                el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
                el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
            });
            el.addEventListener('pointerleave', function () {
                el.classList.remove('tilting');
                el.style.setProperty('--rx', '0deg');
                el.style.setProperty('--ry', '0deg');
            });
        });
    }

    /* ---------------------------------------------------------------
       Scroll-driven UI: nav, progress, back-to-top, timeline, parallax
       --------------------------------------------------------------- */
    var navbar = $('.navbar');
    var progressBar = $('.scroll-progress span');
    var toTop = $('.to-top');
    var timeline = $('.timeline');
    var tlItems = $$('.tl-item');
    var parallaxEls = $$('.parallax');
    var lastY = window.scrollY;
    var ticking = false;

    function onScroll() {
        var y = window.scrollY;
        var vh = window.innerHeight;
        var max = document.documentElement.scrollHeight - vh;
        var progress = max > 0 ? clamp(y / max, 0, 1) : 0;

        navbar.classList.toggle('scrolled', y > 30);
        if (!document.body.classList.contains('menu-open')) {
            var goingDown = y > lastY + 4;
            var goingUp = y < lastY - 4;
            if (goingDown && y > 500) navbar.classList.add('nav-hidden');
            else if (goingUp || y < 500) navbar.classList.remove('nav-hidden');
        }
        lastY = y;

        progressBar.style.transform = 'scaleX(' + progress + ')';
        toTop.classList.toggle('show', y > 600);
        toTop.style.setProperty('--p', progress.toFixed(4));

        if (timeline) {
            var tr = timeline.getBoundingClientRect();
            var line = vh * 0.62;
            var tp = reduceMotion ? 1 : clamp((line - tr.top) / tr.height, 0, 1);
            timeline.style.setProperty('--p', tp.toFixed(4));
            tlItems.forEach(function (item) {
                var node = item.querySelector('.tl-node').getBoundingClientRect();
                item.classList.toggle('lit', reduceMotion || node.top + node.height / 2 < line);
            });
        }

        if (!reduceMotion) {
            parallaxEls.forEach(function (el) {
                var r = el.getBoundingClientRect();
                var speed = parseFloat(el.dataset.speed || '0.05');
                var offset = (r.top + r.height / 2 - vh / 2) * -speed;
                el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
            });
        }
        ticking = false;
    }
    window.addEventListener('scroll', function () {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(onScroll);
        }
    }, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    /* active nav link */
    var navLinks = $$('.menu a[href^="#"]');
    if (hasIO) {
        var sectionIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                navLinks.forEach(function (link) {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        $$('main section[id]').forEach(function (s) { sectionIO.observe(s); });
    }

    /* ---------------------------------------------------------------
       Mobile menu
       --------------------------------------------------------------- */
    var menu = $('#menu');
    var menuBtn = $('.menu-btn');
    $$('li', menu).forEach(function (li, i) { li.style.setProperty('--li', i); });
    function setMenu(open) {
        menu.classList.toggle('active', open);
        document.body.classList.toggle('menu-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        if (open) navbar.classList.remove('nav-hidden');
    }
    menuBtn.addEventListener('click', function () { setMenu(!menu.classList.contains('active')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    window.addEventListener('resize', function () {
        if (window.innerWidth > 980 && menu.classList.contains('active')) setMenu(false);
    });

    /* ---------------------------------------------------------------
       Theme toggle with circular reveal
       --------------------------------------------------------------- */
    var themeBtn = $('.theme-toggle');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    function currentTheme() {
        return root.getAttribute('data-theme') || (systemDark.matches ? 'dark' : 'light');
    }
    function syncThemeButton() {
        var dark = currentTheme() === 'dark';
        themeBtn.querySelector('i').className = dark ? 'fas fa-sun' : 'fas fa-moon';
        themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
    function applyTheme(next) {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        syncThemeButton();
    }
    function toggleTheme(originEl) {
        var next = currentTheme() === 'dark' ? 'light' : 'dark';
        if (!document.startViewTransition || reduceMotion) {
            applyTheme(next);
            return;
        }
        var r = (originEl || themeBtn).getBoundingClientRect();
        var x = r.left + r.width / 2;
        var y = r.top + r.height / 2;
        var end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        var transition = document.startViewTransition(function () { applyTheme(next); });
        transition.ready.then(function () {
            root.animate(
                { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
                { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
            );
        }).catch(function () {});
    }
    themeBtn.addEventListener('click', function () { toggleTheme(themeBtn); });
    if (systemDark.addEventListener) systemDark.addEventListener('change', syncThemeButton);
    syncThemeButton();

    /* ---------------------------------------------------------------
       Dialog helpers (lightbox + command palette)
       --------------------------------------------------------------- */
    function openDialog(dlg) {
        if (typeof dlg.showModal !== 'function') return false;
        dlg.showModal();
        document.body.classList.add('dialog-open');
        return true;
    }
    $$('dialog').forEach(function (dlg) {
        dlg.addEventListener('close', function () {
            if (!$('dialog[open]')) document.body.classList.remove('dialog-open');
        });
        dlg.addEventListener('click', function (e) {
            if (e.target === dlg) dlg.close();   // backdrop click
        });
    });

    /* certificate lightbox */
    var certs = {
        unicompiler: { src: 'images/certificates/unicompiler.jpg', title: 'UNIcompiler: Web Development & Design Internship' },
        axiom: { src: 'images/certificates/axiom-cloud.jpg', title: 'Axiom Cloud Solutions: Certificate of Internship' },
        linkedin: { src: 'images/certificates/linkedin-frontend.jpg', title: 'LinkedIn Learning: Explore a Career in Front-End Web Development' }
    };
    var lightbox = $('.lightbox');
    var lbImg = $('.lightbox-img');
    var lbTitle = $('#lightbox-title');
    $$('[data-cert]').forEach(function (trigger) {
        trigger.addEventListener('click', function (e) {
            var cert = certs[trigger.dataset.cert];
            if (!cert) return;
            e.preventDefault();
            lbImg.src = cert.src;
            lbImg.alt = cert.title + ' certificate';
            lbTitle.textContent = cert.title;
            if (!openDialog(lightbox)) window.open(cert.src, '_blank', 'noopener');
        });
    });
    $('.lightbox-close').addEventListener('click', function () { lightbox.close(); });

    /* ---------------------------------------------------------------
       Command palette (Ctrl/⌘ + K)
       --------------------------------------------------------------- */
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    if (isMac) {
        $$('.palette-btn kbd').forEach(function (k) { k.textContent = '⌘ K'; });
        $$('.kbd-hint kbd').forEach(function (k) { if (k.textContent === 'Ctrl') k.textContent = '⌘'; });
        $('.palette-btn').setAttribute('aria-label', 'Open command palette (⌘K)');
    }
    function goTo(id) {
        var target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    function openUrl(url) { window.open(url, '_blank', 'noopener'); }
    var commands = [
        { group: 'Navigate', icon: 'fas fa-home', label: 'Home', run: function () { goTo('home'); } },
        { group: 'Navigate', icon: 'fas fa-user', label: 'About', run: function () { goTo('about'); } },
        { group: 'Navigate', icon: 'fas fa-briefcase', label: 'Experience', keys: 'work pwc jobs', run: function () { goTo('experience'); } },
        { group: 'Navigate', icon: 'fas fa-rocket', label: 'Projects', run: function () { goTo('projects'); } },
        { group: 'Navigate', icon: 'fas fa-layer-group', label: 'Skills', keys: 'stack tech', run: function () { goTo('skills'); } },
        { group: 'Navigate', icon: 'fas fa-trophy', label: 'Achievements', keys: 'leetcode certifications education', run: function () { goTo('achievements'); } },
        { group: 'Navigate', icon: 'fas fa-paper-plane', label: 'Contact', run: function () { goTo('contact'); } },
        { group: 'Actions', icon: 'fas fa-adjust', label: 'Toggle light / dark theme', keys: 'dark mode', run: function () { toggleTheme(); } },
        { group: 'Actions', icon: 'far fa-copy', label: 'Copy email address', hint: EMAIL, run: function () { copyText(EMAIL, 'Email'); } },
        { group: 'Actions', icon: 'fas fa-file-download', label: 'Download resume', keys: 'cv pdf', run: function () { openUrl('Tanish_Jain_Resume.pdf'); } },
        { group: 'Actions', icon: 'fas fa-envelope', label: 'Send an email', run: function () { window.location.href = 'mailto:' + EMAIL; } },
        { group: 'Links', icon: 'fab fa-github', label: 'GitHub', hint: 'tanishjain158', run: function () { openUrl('https://github.com/tanishjain158'); } },
        { group: 'Links', icon: 'fab fa-linkedin-in', label: 'LinkedIn', run: function () { openUrl('https://www.linkedin.com/in/tanish-jain-68b285217'); } },
        { group: 'Links', icon: 'fas fa-gamepad', label: 'Board Game Inc. (live)', keys: 'project', run: function () { openUrl('https://chimerical-hummingbird-a213c6.netlify.app/'); } },
        { group: 'Links', icon: 'fas fa-chart-line', label: 'COVID-19 dashboard (live)', keys: 'project data', run: function () { openUrl('https://covid19-dash.github.io/'); } }
    ];
    var palette = $('.palette');
    var palInput = $('.palette-input');
    var palList = $('.palette-list');
    var filtered = commands;
    var activeIndex = 0;

    function renderPalette() {
        var q = palInput.value.trim().toLowerCase();
        filtered = commands.filter(function (c) {
            return !q || (c.label + ' ' + c.group + ' ' + (c.keys || '')).toLowerCase().indexOf(q) !== -1;
        });
        activeIndex = clamp(activeIndex, 0, Math.max(filtered.length - 1, 0));
        palList.innerHTML = '';
        if (!filtered.length) {
            var empty = document.createElement('li');
            empty.className = 'palette-empty';
            empty.textContent = 'No results for "' + palInput.value + '"';
            palList.appendChild(empty);
            palInput.removeAttribute('aria-activedescendant');
            return;
        }
        var lastGroup = '';
        filtered.forEach(function (cmd, i) {
            if (cmd.group !== lastGroup) {
                lastGroup = cmd.group;
                var g = document.createElement('li');
                g.className = 'palette-group';
                g.setAttribute('role', 'presentation');
                g.textContent = cmd.group;
                palList.appendChild(g);
            }
            var li = document.createElement('li');
            li.className = 'palette-item';
            li.id = 'pal-opt-' + i;
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', String(i === activeIndex));
            li.innerHTML = '<i class="' + cmd.icon + '" aria-hidden="true"></i><span></span>' + (cmd.hint ? '<span class="pi-hint"></span>' : '');
            li.children[1].textContent = cmd.label;
            if (cmd.hint) li.children[2].textContent = cmd.hint;
            li.addEventListener('mousemove', function () {
                if (activeIndex !== i) { activeIndex = i; updateActive(); }
            });
            li.addEventListener('click', function () { runCommand(i); });
            palList.appendChild(li);
        });
        updateActive();
    }
    function updateActive() {
        $$('.palette-item', palList).forEach(function (li, i) {
            li.setAttribute('aria-selected', String(i === activeIndex));
        });
        var current = $('#pal-opt-' + activeIndex);
        if (current) {
            palInput.setAttribute('aria-activedescendant', current.id);
            current.scrollIntoView({ block: 'nearest' });
        }
    }
    function runCommand(i) {
        var cmd = filtered[i];
        if (!cmd) return;
        palette.close();
        setTimeout(cmd.run, 60);
    }
    function openPalette() {
        if (palette.open) return;
        palInput.value = '';
        activeIndex = 0;
        renderPalette();
        if (openDialog(palette)) palInput.focus();
    }
    palInput.addEventListener('input', function () { activeIndex = 0; renderPalette(); });
    palInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = (activeIndex + 1) % Math.max(filtered.length, 1); updateActive(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = (activeIndex - 1 + filtered.length) % Math.max(filtered.length, 1); updateActive(); }
        else if (e.key === 'Enter') { e.preventDefault(); runCommand(activeIndex); }
    });
    $('.palette-btn').addEventListener('click', openPalette);
    document.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (palette.open) palette.close(); else openPalette();
        } else if (e.key === 'Escape' && menu.classList.contains('active')) {
            setMenu(false);
            menuBtn.focus();
        }
    });

    /* ---------------------------------------------------------------
       Marquee: duplicate the track so the loop is seamless
       --------------------------------------------------------------- */
    $$('.marquee-track').forEach(function (track) {
        Array.prototype.slice.call(track.children).forEach(function (child) {
            track.appendChild(child.cloneNode(true));
        });
    });

    /* ---------------------------------------------------------------
       Copy buttons, contact form, footer year
       --------------------------------------------------------------- */
    $$('.copy-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            copyText(btn.dataset.copy, btn.dataset.copy.indexOf('@') !== -1 ? 'Email' : 'Phone number');
        });
    });

    var form = $('.contact-form');
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var data = new FormData(form);
        var body = data.get('message') + '\n\n' + data.get('name') + '\n' + data.get('email');
        window.location.href = 'mailto:' + EMAIL +
            '?subject=' + encodeURIComponent(data.get('subject')) +
            '&body=' + encodeURIComponent(body);
        $('.form-note', form).textContent = 'Your email app should open now. If it doesn\'t, email ' + EMAIL + ' directly.';
        toast('Opening your email app');
    });

    var yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
