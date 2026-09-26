/* Tanish Jain · Portfolio interactions (vanilla JS, no dependencies) */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var hasIO = 'IntersectionObserver' in window;
    var EMAIL = 'tanishharsh158@gmail.com';

    function icon(name) {
        return '<svg class="i i-' + name + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
    }
    // run fn once the page has loaded and the main thread is idle
    function whenIdle(fn) {
        function go() {
            if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 1200 });
            else setTimeout(fn, 200);
        }
        if (document.readyState === 'complete') go();
        else window.addEventListener('load', go, { once: true });
    }
    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
    function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

    /* ---------------------------------------------------------------
       Toast
       --------------------------------------------------------------- */
    var toastEl = $('.toast');
    var toastTimer;
    function toast(message) {
        toastEl.innerHTML = icon('check-circle') + message;
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
    // Gradient words are coloured per letter with solid colours. Clipping a
    // gradient to text (background-clip: text) on letters that also animate
    // on their own GPU layers renders as smeared/duplicated glyphs in Chrome.
    var GRAD_STOPS = [[220, 20, 60], [255, 77, 109], [255, 138, 76]];
    function gradColor(t) {
        var seg = Math.min(Math.floor(t * (GRAD_STOPS.length - 1)), GRAD_STOPS.length - 2);
        var f = t * (GRAD_STOPS.length - 1) - seg;
        var a = GRAD_STOPS[seg], b = GRAD_STOPS[seg + 1];
        return 'rgb(' + [0, 1, 2].map(function (k) { return Math.round(a[k] + (b[k] - a[k]) * f); }).join(',') + ')';
    }
    var charIndex = 0;
    $$('[data-split]').forEach(function (el) {
        var text = el.textContent;
        var gradient = el.classList.contains('grad-text');
        el.classList.remove('grad-text');
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
            if (gradient) span.style.color = gradColor(text.length > 1 ? i / (text.length - 1) : 0);
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
            inner.className = 'wi';
            inner.style.setProperty('--i', i);
            if (i === words.length - 1) {
                // gradient lives on a child so the moving .wi never clips text itself
                var g = document.createElement('span');
                g.className = 'grad-word';
                g.textContent = word;
                inner.appendChild(g);
            } else {
                inner.textContent = word;
            }
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
        $$('.kicker', el).forEach(decodeKicker);
    }
    // "cipher" decode of the kicker label (the text after the number badge)
    function decodeKicker(kicker) {
        if (reduceMotion || kicker.dataset.decoded) return;
        kicker.dataset.decoded = '1';
        var node = kicker.lastChild;
        if (!node || node.nodeType !== 3) return;
        var target = node.textContent;
        var glyphs = '!<>-_\\/[]{}=+*^?#01';
        var frame = 0, total = 22;
        (function tick() {
            var out = '';
            for (var i = 0; i < target.length; i++) {
                var settle = (i / target.length) * total;
                out += (frame >= settle || target[i] === ' ') ? target[i] : glyphs[Math.floor(Math.random() * glyphs.length)];
            }
            node.textContent = out;
            if (frame++ < total) setTimeout(tick, 38);
            else node.textContent = target;
        })();
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
            var count = Math.round(clamp(W * H / 13000, 28, 95));
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

        var BANDS = 4;
        var drawFrame = function () {
            ctx.clearRect(0, 0, W, H);
            var linkDist = W < 700 ? 96 : 118;
            var link2 = linkDist * linkDist;
            var lines = [];
            for (var b = 0; b < BANDS; b++) lines.push(new Path2D());
            var toPointer = new Path2D();
            var dotsCool = new Path2D();
            var dotsWarm = new Path2D();
            var pointerActive = pointer.x > -1000;
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                if (!reduceMotion) {
                    if (pointerActive) {
                        var dx = p.x - pointer.x;
                        var dy = p.y - pointer.y;
                        var d2 = dx * dx + dy * dy;
                        if (d2 < 22500 && d2 > 0.01) {
                            var d = Math.sqrt(d2);
                            var force = (1 - d / 150) * 0.6;
                            p.x += (dx / d) * force;
                            p.y += (dy / d) * force;
                        }
                    }
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < -10) p.x = W + 10;
                    else if (p.x > W + 10) p.x = -10;
                    if (p.y < -10) p.y = H + 10;
                    else if (p.y > H + 10) p.y = -10;
                }
                for (var j = i + 1; j < particles.length; j++) {
                    var q = particles[j];
                    var lx = p.x - q.x;
                    var ly = p.y - q.y;
                    var ld = lx * lx + ly * ly;
                    if (ld < link2) {
                        // closer pairs go in brighter bands
                        var band = Math.min(BANDS - 1, Math.floor((1 - Math.sqrt(ld) / linkDist) * BANDS));
                        lines[band].moveTo(p.x, p.y);
                        lines[band].lineTo(q.x, q.y);
                    }
                }
                if (pointerActive) {
                    var mx = p.x - pointer.x;
                    var my = p.y - pointer.y;
                    if (mx * mx + my * my < 32400) {
                        toPointer.moveTo(p.x, p.y);
                        toPointer.lineTo(pointer.x, pointer.y);
                    }
                }
                var dots = p.warm ? dotsWarm : dotsCool;
                dots.moveTo(p.x + p.r, p.y);
                dots.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            }
            ctx.lineWidth = 0.8;
            for (var k = 0; k < BANDS; k++) {
                ctx.strokeStyle = 'rgba(255, 120, 145, ' + (((k + 0.5) / BANDS) * 0.3).toFixed(3) + ')';
                ctx.stroke(lines[k]);
            }
            if (pointerActive) {
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(255, 170, 120, 0.22)';
                ctx.stroke(toPointer);
            }
            ctx.fillStyle = 'rgba(255, 110, 140, 0.9)';
            ctx.fill(dotsCool);
            ctx.fillStyle = 'rgba(255, 170, 120, 0.9)';
            ctx.fill(dotsWarm);
        };

        var canvasLoop = function () {
            if (heroVisible && !document.hidden) drawFrame();
            requestAnimationFrame(canvasLoop);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        if (reduceMotion) drawFrame();
        else whenIdle(function () { requestAnimationFrame(canvasLoop); });
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

        var R = globeEl.clientWidth * 0.44;
        window.addEventListener('resize', function () { R = globeEl.clientWidth * 0.44; });
        var renderGlobe = function () {
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
                var z = Math.round(depth * 100);
                if (z !== p.zi) { p.el.style.zIndex = z; p.zi = z; }
                var hot = depth > 0.82;
                if (hot !== p.hot) { p.el.classList.toggle('hot', hot); p.hot = hot; }
            }
        };

        var globeLoop = function () {
            if (heroVisible && !document.hidden) renderGlobe();
            requestAnimationFrame(globeLoop);
        };
        renderGlobe();
        if (!reduceMotion) {
            whenIdle(function () { requestAnimationFrame(globeLoop); });
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
            var labelled = e.target.closest('[data-cursor]');
            ring.classList.toggle('labelled', !!labelled);
            root.classList.toggle('cursor-labelled', !!labelled);
            if (labelled) ring.setAttribute('data-label', labelled.getAttribute('data-cursor'));
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

    var tlNodes = tlItems.map(function (item) { return item.querySelector('.tl-node'); });
    var heroInner = $('.hero-inner');
    var rail = $('.rail');
    var scrollVel = 0, lastScrollT = performance.now(), lastScrollY = window.scrollY;
    function onScroll() {
        // --- read phase (no DOM writes until every measurement is taken) ---
        var y = window.scrollY;
        var vh = window.innerHeight;
        var max = document.documentElement.scrollHeight - vh;
        var progress = max > 0 ? clamp(y / max, 0, 1) : 0;
        var line = vh * 0.62;
        var tr = timeline ? timeline.getBoundingClientRect() : null;
        var nodeMids = tlNodes.map(function (node) {
            var r = node.getBoundingClientRect();
            return r.top + r.height / 2;
        });
        var parallaxRects = reduceMotion ? [] : parallaxEls.map(function (el) { return el.getBoundingClientRect(); });

        // --- write phase ---
        navbar.classList.toggle('scrolled', y > 30);
        if (!document.body.classList.contains('menu-open')) {
            if (y > lastY + 4 && y > 500) navbar.classList.add('nav-hidden');
            else if (y < lastY - 4 || y < 500) navbar.classList.remove('nav-hidden');
        }
        lastY = y;

        progressBar.style.transform = 'scaleX(' + progress + ')';
        toTop.classList.toggle('show', y > 600);
        toTop.style.setProperty('--p', progress.toFixed(4));

        if (tr) {
            var tp = reduceMotion ? 1 : clamp((line - tr.top) / tr.height, 0, 1);
            timeline.style.setProperty('--p', tp.toFixed(4));
            tlItems.forEach(function (item, k) {
                item.classList.toggle('lit', reduceMotion || nodeMids[k] < line);
            });
        }
        // scroll velocity (px/ms, smoothed) feeds the marquees
        var nowT = performance.now();
        var dt = Math.max(nowT - lastScrollT, 1);
        scrollVel = scrollVel * 0.6 + ((y - lastScrollY) / dt) * 0.4;
        lastScrollT = nowT;
        lastScrollY = y;

        if (rail) rail.classList.toggle('show', y > vh * 0.6);
        if (heroInner && !reduceMotion && y < vh * 1.2) {
            var hp = y / vh;
            heroInner.style.transform = 'translate3d(0,' + (y * 0.28).toFixed(1) + 'px,0) scale(' + (1 - hp * 0.06).toFixed(4) + ')';
            heroInner.style.opacity = Math.max(0, 1 - hp * 1.1).toFixed(3);
        }
        parallaxRects.forEach(function (r, k) {
            var el = parallaxEls[k];
            var offset = (r.top + r.height / 2 - vh / 2) * -parseFloat(el.dataset.speed || '0.05');
            el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
        });
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
        themeBtn.querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
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
        { group: 'Navigate', icon: 'home', label: 'Home', run: function () { goTo('home'); } },
        { group: 'Navigate', icon: 'user', label: 'About', run: function () { goTo('about'); } },
        { group: 'Navigate', icon: 'briefcase', label: 'Experience', keys: 'work pwc jobs', run: function () { goTo('experience'); } },
        { group: 'Navigate', icon: 'rocket', label: 'Projects', run: function () { goTo('projects'); } },
        { group: 'Navigate', icon: 'layer-group', label: 'Skills', keys: 'stack tech', run: function () { goTo('skills'); } },
        { group: 'Navigate', icon: 'trophy', label: 'Achievements', keys: 'leetcode certifications education', run: function () { goTo('achievements'); } },
        { group: 'Navigate', icon: 'paper-plane', label: 'Contact', run: function () { goTo('contact'); } },
        { group: 'Actions', icon: 'adjust', label: 'Toggle light / dark theme', keys: 'dark mode', run: function () { toggleTheme(); } },
        { group: 'Actions', icon: 'copy', label: 'Copy email address', hint: EMAIL, run: function () { copyText(EMAIL, 'Email'); } },
        { group: 'Actions', icon: 'file-download', label: 'Download resume', keys: 'cv pdf', run: function () { openUrl('Tanish_Jain_Resume.pdf'); } },
        { group: 'Actions', icon: 'envelope', label: 'Send an email', run: function () { window.location.href = 'mailto:' + EMAIL; } },
        { group: 'Actions', icon: 'terminal', label: 'Open the terminal', keys: 'console shell cli', hint: '`', run: function () { openTerminal(); } },
        { group: 'Actions', icon: 'keyboard', label: 'Keyboard shortcuts', keys: 'help keys', hint: '?', run: function () { openDialog(shortcutsDlg); } },
        { group: 'Links', icon: 'github', label: 'GitHub', hint: 'tanishjain158', run: function () { openUrl('https://github.com/tanishjain158'); } },
        { group: 'Links', icon: 'linkedin-in', label: 'LinkedIn', run: function () { openUrl('https://www.linkedin.com/in/tanish-jain-68b285217'); } },
        { group: 'Links', icon: 'gamepad', label: 'Board Game Inc. (live)', keys: 'project', run: function () { openUrl('https://chimerical-hummingbird-a213c6.netlify.app/'); } },
        { group: 'Links', icon: 'chart-line', label: 'COVID-19 dashboard (live)', keys: 'project data', run: function () { openUrl('https://covid19-dash.github.io/'); } }
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
            li.innerHTML = icon(cmd.icon) + '<span></span>' + (cmd.hint ? '<span class="pi-hint"></span>' : '');
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
    // velocity-reactive marquees: drift at a base speed, speed up and lean with scroll speed
    if (!reduceMotion) {
        var marquees = $$('.marquee').map(function (m) {
            m.classList.add('js-marquee');
            return { el: m, track: $('.marquee-track', m), x: 0, dir: m.classList.contains('reverse') ? 1 : -1, hover: false, visible: true, half: 0 };
        });
        marquees.forEach(function (mq) {
            mq.el.addEventListener('pointerenter', function () { mq.hover = true; });
            mq.el.addEventListener('pointerleave', function () { mq.hover = false; });
            if (hasIO) new IntersectionObserver(function (en) { mq.visible = en[0].isIntersecting; }).observe(mq.el);
        });
        var measure = function () { marquees.forEach(function (mq) { mq.half = mq.track.scrollWidth / 2; }); };
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('load', measure);
        var mqLast = performance.now(), skew = 0, boostDir = 1;
        (function marqueeLoop(now) {
            var dt = Math.min((now || performance.now()) - mqLast, 50);
            mqLast = now || performance.now();
            var v = scrollVel;                         // px per ms
            if (Math.abs(v) > 0.05) boostDir = v > 0 ? 1 : -1;
            skew += (clamp(v * 3, -8, 8) - skew) * 0.12;
            marquees.forEach(function (mq) {
                if (!mq.visible || !mq.half) return;
                var speed = (mq.hover ? 0.012 : 0.05) + Math.min(Math.abs(v) * 0.9, 2.2);
                mq.x += mq.dir * boostDir * speed * dt;
                if (mq.x <= -mq.half) mq.x += mq.half;
                if (mq.x > 0) mq.x -= mq.half;
                mq.track.style.transform = 'translate3d(' + mq.x.toFixed(1) + 'px,0,0) skewX(' + (-skew).toFixed(2) + 'deg)';
            });
            scrollVel *= 0.92;                          // settle when scrolling stops
            requestAnimationFrame(marqueeLoop);
        })();
    }

    /* ---------------------------------------------------------------
       Live GitHub repositories (fetched when the section is near view)
       --------------------------------------------------------------- */
    var ghSection = $('.gh');
    if (ghSection && window.fetch) {
        var GH_USER = 'tanishjain158';
        var GH_CACHE = 'gh-cache-v1';
        var langColors = {
            JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219', HTML: '#e34c26',
            CSS: '#563d7c', 'C++': '#f34b7d', C: '#555555', 'Jupyter Notebook': '#DA5B0B', PHP: '#4F5D95',
            Dart: '#00B4AB', Shell: '#89e051', Go: '#00ADD8', Kotlin: '#A97BFF', SCSS: '#c6538c', Vue: '#41b883'
        };
        var ghGrid = $('.gh-grid', ghSection);
        var ghStats = $('.gh-stats', ghSection);
        ghSection.hidden = false;

        var el = function (tag, cls, text) {
            var node = document.createElement(tag);
            if (cls) node.className = cls;
            if (text != null) node.textContent = text;
            return node;
        };
        var iconEl = function (name) {
            var wrap = document.createElement('span');
            wrap.innerHTML = icon(name);
            return wrap.firstChild;
        };
        var timeAgo = function (iso) {
            var secs = (Date.now() - new Date(iso).getTime()) / 1000;
            var units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
            for (var u = 0; u < units.length; u++) {
                var v = Math.floor(secs / units[u][1]);
                if (v >= 1) return v + ' ' + units[u][0] + (v > 1 ? 's' : '') + ' ago';
            }
            return 'just now';
        };
        var renderGitHub = function (data) {
            var repos = data.repos.filter(function (r) { return !r.fork && !r.archived; })
                .sort(function (a, b) { return new Date(b.pushed_at) - new Date(a.pushed_at); })
                .slice(0, 6);
            if (!repos.length) throw new Error('no repos');
            var stars = data.repos.reduce(function (sum, r) { return sum + (r.fork ? 0 : r.stargazers_count); }, 0);
            [[data.user.public_repos, 'repos'], [data.user.followers, 'followers'], [stars, 'stars']].forEach(function (st) {
                var li = el('li');
                li.appendChild(el('strong', null, String(st[0])));
                li.appendChild(document.createTextNode(' ' + st[1]));
                ghStats.appendChild(li);
            });
            ghGrid.textContent = '';
            repos.forEach(function (r) {
                var li = el('li', 'gh-card');
                var a = el('a', 'gh-link');
                a.href = r.html_url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.setAttribute('data-cursor', 'Open');
                var name = el('span', 'gh-name');
                name.appendChild(iconEl('book'));
                name.appendChild(document.createTextNode(r.name));
                a.appendChild(name);
                a.appendChild(el('p', 'gh-desc', r.description || 'No description yet.'));
                var meta = el('span', 'gh-meta');
                if (r.language) {
                    var lang = el('span');
                    var dotEl = el('i', 'gh-lang-dot');
                    dotEl.style.setProperty('--c', langColors[r.language] || '#ff4d6d');
                    lang.appendChild(dotEl);
                    lang.appendChild(document.createTextNode(r.language));
                    meta.appendChild(lang);
                }
                var star = el('span');
                star.appendChild(iconEl('star'));
                star.appendChild(document.createTextNode(String(r.stargazers_count)));
                star.setAttribute('aria-label', r.stargazers_count + ' stars');
                meta.appendChild(star);
                var fork = el('span');
                fork.appendChild(iconEl('code-branch'));
                fork.appendChild(document.createTextNode(String(r.forks_count)));
                fork.setAttribute('aria-label', r.forks_count + ' forks');
                meta.appendChild(fork);
                var upd = el('span');
                upd.appendChild(iconEl('clock'));
                upd.appendChild(document.createTextNode(timeAgo(r.pushed_at)));
                meta.appendChild(upd);
                a.appendChild(meta);
                li.appendChild(a);
                ghGrid.appendChild(li);
            });
            ghGrid.setAttribute('aria-busy', 'false');
        };
        var loadGitHub = function () {
            var cached = null;
            try { cached = JSON.parse(sessionStorage.getItem(GH_CACHE) || 'null'); } catch (e) {}
            if (cached && Date.now() - cached.t < 3600000) {
                try { renderGitHub(cached.d); return; } catch (e) {}
            }
            var api = 'https://api.github.com/users/' + GH_USER;
            var get = function (url) {
                return fetch(url, { headers: { Accept: 'application/vnd.github+json' } }).then(function (res) {
                    if (!res.ok) throw new Error('GitHub API ' + res.status);
                    return res.json();
                });
            };
            Promise.all([get(api), get(api + '/repos?per_page=100&sort=pushed')]).then(function (res) {
                var data = { user: res[0], repos: res[1] };
                renderGitHub(data);
                try { sessionStorage.setItem(GH_CACHE, JSON.stringify({ t: Date.now(), d: data })); } catch (e) {}
            }).catch(function () {
                ghSection.hidden = true;   // rate-limited or offline: the projects above still stand on their own
            });
        };
        if (hasIO) {
            var ghIO = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    ghIO.disconnect();
                    loadGitHub();
                }
            }, { rootMargin: '600px 0px' });
            ghIO.observe(ghSection);
        } else {
            loadGitHub();
        }
    }

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

    /* ---------------------------------------------------------------
       Hero name: dock-style letters that rise toward the cursor
       --------------------------------------------------------------- */
    var heroName = $('.hero-name');
    if (heroName && finePointer && !reduceMotion) {
        var chars = $$('.char', heroName);
        var dockRaf = 0, dockX = 0, dockY = 0;
        var applyDock = function () {
            dockRaf = 0;
            chars.forEach(function (ch) {
                var r = ch.getBoundingClientRect();
                var d = Math.hypot(dockX - (r.left + r.width / 2), (dockY - (r.top + r.height / 2)) * 0.6);
                var f = Math.max(0, 1 - d / 170);
                f = f * f * (3 - 2 * f);                 // smoothstep
                ch.style.translate = '0 ' + (-f * 0.14).toFixed(3) + 'em';
                ch.style.scale = (1 + f * 0.1).toFixed(3);
            });
        };
        heroName.addEventListener('pointermove', function (e) {
            dockX = e.clientX; dockY = e.clientY;
            heroName.classList.add('docking');
            if (!dockRaf) dockRaf = requestAnimationFrame(applyDock);
        });
        heroName.addEventListener('pointerleave', function () {
            heroName.classList.remove('docking');
            chars.forEach(function (ch) { ch.style.translate = ''; ch.style.scale = ''; });
        });
    }

    /* ---------------------------------------------------------------
       Footer spotlight on the giant name
       --------------------------------------------------------------- */
    var footerEl = $('.footer');
    var giant = $('.footer-giant');
    if (footerEl && giant && finePointer) {
        footerEl.addEventListener('pointermove', function (e) {
            var r = giant.getBoundingClientRect();
            giant.style.setProperty('--fx', (e.clientX - r.left) + 'px');
            giant.style.setProperty('--fy', (e.clientY - r.top) + 'px');
        });
    }

    /* ---------------------------------------------------------------
       Section rail (active dot)
       --------------------------------------------------------------- */
    var railLinks = $$('.rail a');
    if (railLinks.length && hasIO) {
        var railIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                railLinks.forEach(function (a) {
                    var on = a.getAttribute('href') === '#' + entry.target.id;
                    a.classList.toggle('active', on);
                    if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        $$('main section[id]').forEach(function (sec) { railIO.observe(sec); });
    }

    /* ---------------------------------------------------------------
       Local time in Indore
       --------------------------------------------------------------- */
    var localTime = $('.local-time');
    if (localTime && window.Intl) {
        var fmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true, weekday: 'short' });
        var tickClock = function () { localTime.textContent = fmt.format(new Date()) + ' IST'; };
        tickClock();
        setInterval(tickClock, 30000);
    }

    /* ---------------------------------------------------------------
       Project filter with FLIP animation
       --------------------------------------------------------------- */
    var filterChips = $$('.filter-chip');
    var projects = $$('.project[data-cats]');
    var filterStatus = $('.filter-status');
    if (filterChips.length) {
        filterChips.forEach(function (chip) {
            var f = chip.dataset.filter;
            var n = projects.filter(function (p) { return f === 'all' || p.dataset.cats.split(' ').indexOf(f) !== -1; }).length;
            $('.count', chip).textContent = n;
            chip.addEventListener('click', function () { applyFilter(f, chip); });
        });
    }
    function applyFilter(f, chip) {
        var first = new Map();
        projects.forEach(function (p) { if (!p.classList.contains('filtered-out')) first.set(p, p.getBoundingClientRect()); });
        filterChips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        var shown = 0;
        projects.forEach(function (p) {
            var match = f === 'all' || p.dataset.cats.split(' ').indexOf(f) !== -1;
            p.classList.toggle('filtered-out', !match);
            if (match) shown++;
        });
        if (filterStatus) filterStatus.textContent = 'Showing ' + shown + ' of ' + projects.length + ' projects';
        if (reduceMotion || !projects[0].animate) return;
        projects.forEach(function (p) {
            if (p.classList.contains('filtered-out')) return;
            var last = p.getBoundingClientRect();
            var prev = first.get(p);
            if (prev) {
                var dx = prev.left - last.left, dy = prev.top - last.top;
                if (dx || dy) p.animate([{ translate: dx + 'px ' + dy + 'px' }, { translate: '0 0' }], { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
            } else {
                p.animate([{ opacity: 0, scale: '0.9', translate: '0 24px' }, { opacity: 1, scale: '1', translate: '0 0' }], { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
            }
        });
    }

    /* ---------------------------------------------------------------
       Confetti (terminal "hire" command + Konami code)
       --------------------------------------------------------------- */
    function confetti() {
        if (reduceMotion) return;
        var cv = document.createElement('canvas');
        cv.className = 'confetti';
        document.body.appendChild(cv);
        var cx2 = cv.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
        cx2.scale(dpr, dpr);
        var colors = ['#dc143c', '#ff4d6d', '#ff8a4c', '#ffd166', '#ffffff', '#a78bfa'];
        var bits = [];
        for (var i = 0; i < 160; i++) {
            var fromLeft = i % 2 === 0;
            bits.push({
                x: fromLeft ? 0 : innerWidth, y: innerHeight * 0.75,
                vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9), vy: -(9 + Math.random() * 11),
                w: 6 + Math.random() * 6, h: 8 + Math.random() * 10, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
                c: colors[i % colors.length]
            });
        }
        var start = performance.now();
        (function frame(now) {
            var t = now - start;
            cx2.clearRect(0, 0, innerWidth, innerHeight);
            bits.forEach(function (b) {
                b.vy += 0.32; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
                cx2.save();
                cx2.globalAlpha = Math.max(0, 1 - t / 3200);
                cx2.translate(b.x, b.y); cx2.rotate(b.r);
                cx2.fillStyle = b.c;
                cx2.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 2)));
                cx2.restore();
            });
            if (t < 3300) requestAnimationFrame(frame); else cv.remove();
        })(start);
    }

    /* ---------------------------------------------------------------
       Interactive terminal
       --------------------------------------------------------------- */
    var PROFILE = {
        name: 'Tanish Jain',
        role: 'AI Engineer @ PwC · Software Engineer',
        location: 'Indore, India',
        email: EMAIL,
        phone: '+91 96020 01568',
        github: 'https://github.com/tanishjain158',
        linkedin: 'https://www.linkedin.com/in/tanish-jain-68b285217',
        resume: 'Tanish_Jain_Resume.pdf',
        summary: [
            'Software engineer with 2+ years designing and scaling full-stack apps,',
            'data pipelines and AI features with Java, MERN, Python, GCP and AWS.',
            'Impact: 40% faster data ingestion · 30% better ML accuracy · 90% fewer security incidents.'
        ],
        experience: [
            ['2026 – Present', 'AI Engineer', 'PwC'],
            ['Mar 2026 – Apr 2026', 'Network Engineer', 'Moreyeahs Pvt. Limited'],
            ['Feb 2025 – Aug 2025', 'Junior Software Engineer', 'iEnergizer IT Solutions'],
            ['Jan 2024 – Nov 2024', 'Software Development Engineer', 'Growwstacks Automation Solutions']
        ],
        projects: [
            ['AI-Powered Code Review Engine', 'MERN · Gemini API · Render', 'https://hiring-search.careerflow.ai/'],
            ['Data Visualization: COVID-19', 'Next.js · Kafka · Spark · Hive · HBase', 'https://covid19-dash.github.io/'],
            ['Board Game Inc.', 'Next.js · React · Stripe · MongoDB', 'https://chimerical-hummingbird-a213c6.netlify.app/'],
            ['Portfolio', 'HTML · CSS · JavaScript', 'https://github.com/tanishjain158/TanishPortfolio']
        ],
        skills: [
            ['languages', 'Java, C++, C, Python, JavaScript, TypeScript, SQL, Bash'],
            ['frontend', 'React, Next.js, AngularJS, Redux, HTML5, CSS3, Bootstrap, MUI'],
            ['backend', 'Node.js, Express, Spring Boot, Django, MongoDB, REST, Microservices'],
            ['cloud/data', 'GCP, AWS, Docker, Kubernetes, Airflow, Kafka, Spark, Hive, HBase'],
            ['ml', 'Machine Learning, AI, Data Analytics, DSA']
        ],
        education: 'B.Tech Computer Science · Medi-Caps University · CGPA 9.14 · 2020–2024',
        certs: ['AWS (Amazon) · 2023', 'CCNA (Cisco) · 2024', 'Microsoft AI & ML Engineering · 2024'],
        achievements: [
            'LeetCode top 10% globally · 1737 rating · 700+ problems',
            'Google Kickstart 2022 · rank 3,394 / 17,464',
            '1st prize · GDSC Flutter Quiz, IIT Indore (2023)',
            'Hacktoberfest 2022 · 3 badges',
            'Programming mentor · BitByte (20 students)'
        ]
    };
    var termDlg = $('.terminal');
    var termOut = $('.term-out');
    var termInput = $('.term-input');
    var termForm = $('.term-form');
    var termBody = $('.term-body');
    var termHistory = [], histIdx = 0, termBooted = false;
    var shortcutsDlg = $('.shortcuts');

    function tLine(parts) {
        // parts: array of strings or [text, className] or {link, text}
        var line = document.createElement('span');
        line.className = 't-line';
        (Array.isArray(parts) ? parts : [parts]).forEach(function (p) {
            if (typeof p === 'string') {
                line.appendChild(document.createTextNode(p));
            } else if (p.link) {
                var a = document.createElement('a');
                a.href = p.link;
                if (/^https?:/.test(p.link) || /\.pdf$/.test(p.link)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
                a.textContent = p.text || p.link;
                line.appendChild(a);
            } else {
                var span = document.createElement('span');
                span.className = p[1];
                span.textContent = p[0];
                line.appendChild(span);
            }
        });
        termOut.appendChild(line);
        return line;
    }
    function tBlank() { tLine(''); }
    function scrollTerm() { termBody.scrollTop = termBody.scrollHeight; }
    function pad(str, n) { str = String(str); while (str.length < n) str += ' '; return str; }

    var termCommands = {
        help: { d: 'list available commands', run: function () {
            tLine([['Available commands:', 't-accent']]);
            Object.keys(termCommands).forEach(function (k) {
                if (termCommands[k].hidden) return;
                tLine(['  ', [pad(k, 14), 't-ok'], termCommands[k].d]);
            });
            tLine([['  Tip: ', 't-dim'], ['Tab completes, ↑/↓ browse history, Ctrl+L clears.', 't-dim']]);
        } },
        about: { d: 'who I am', run: function () {
            tLine([[PROFILE.name, 't-accent'], ' · ', PROFILE.role]);
            PROFILE.summary.forEach(function (l) { tLine(l); });
        } },
        whoami: { d: 'short intro', run: function () { tLine([['visitor', 't-ok'], ' — exploring ', [PROFILE.name, 't-accent'], "'s portfolio. Welcome!"]); } },
        experience: { d: 'work history', run: function () {
            PROFILE.experience.forEach(function (e) { tLine([[pad(e[0], 22), 't-dim'], [e[1], 't-cmd'], ' @ ', [e[2], 't-accent']]); });
        } },
        projects: { d: 'things I have built', run: function () {
            PROFILE.projects.forEach(function (p, i) {
                tLine([[(i + 1) + '. ', 't-dim'], [p[0], 't-accent']]);
                tLine(['   ', [p[1], 't-dim'], '  ', { link: p[2], text: 'open ↗' }]);
            });
        } },
        skills: { d: 'technical toolkit', run: function () {
            PROFILE.skills.forEach(function (s2) { tLine([[pad(s2[0], 12), 't-ok'], s2[1]]); });
        } },
        education: { d: 'degree', run: function () { tLine(PROFILE.education); } },
        certs: { d: 'certifications', run: function () { PROFILE.certs.forEach(function (c2) { tLine([['✓ ', 't-ok'], c2]); }); } },
        achievements: { d: 'wins & rankings', run: function () { PROFILE.achievements.forEach(function (a2) { tLine([['★ ', 't-accent'], a2]); }); } },
        contact: { d: 'how to reach me', run: function () {
            tLine([[pad('email', 10), 't-ok'], { link: 'mailto:' + PROFILE.email, text: PROFILE.email }]);
            tLine([[pad('phone', 10), 't-ok'], { link: 'tel:+919602001568', text: PROFILE.phone }]);
            tLine([[pad('linkedin', 10), 't-ok'], { link: PROFILE.linkedin }]);
            tLine([[pad('github', 10), 't-ok'], { link: PROFILE.github }]);
        } },
        resume: { d: 'open my resume (PDF)', run: function () { tLine(['Opening ', { link: PROFILE.resume, text: 'Tanish_Jain_Resume.pdf' }, ' …']); openUrl(PROFILE.resume); } },
        open: { d: 'open github | linkedin | resume | email', args: ['github', 'linkedin', 'resume', 'email'], run: function (arg) {
            var map = { github: PROFILE.github, linkedin: PROFILE.linkedin, resume: PROFILE.resume, email: 'mailto:' + PROFILE.email };
            if (!map[arg]) return tLine([['usage: open github | linkedin | resume | email', 't-err']]);
            tLine(['Opening ', [arg, 't-accent'], ' …']);
            if (arg === 'email') window.location.href = map[arg]; else openUrl(map[arg]);
        } },
        goto: { d: 'jump to a section', args: ['about', 'experience', 'projects', 'skills', 'achievements', 'contact', 'home'], run: function (arg) {
            if (!document.getElementById(arg)) return tLine([['usage: goto about | experience | projects | skills | achievements | contact', 't-err']]);
            termDlg.close();
            setTimeout(function () { goTo(arg); }, 80);
        } },
        theme: { d: 'theme light | dark | toggle', args: ['light', 'dark', 'toggle'], run: function (arg) {
            var cur = currentTheme();
            var next = arg === 'light' || arg === 'dark' ? arg : (cur === 'dark' ? 'light' : 'dark');
            if (next !== cur) toggleTheme(termDlg.querySelector('.term-dots'));
            tLine(['Theme set to ', [next, 't-accent'], '.']);
        } },
        neofetch: { d: 'system info, portfolio style', run: function () {
            var art = ['   ████████╗     ██╗', '   ╚══██╔══╝     ██║', '      ██║        ██║', '      ██║   ██   ██║', '      ██║   ╚█████╔╝', '      ╚═╝    ╚════╝ '];
            var info = [
                [['tanish', 't-accent'], '@', ['portfolio', 't-accent']],
                ['----------------'],
                [['role      ', 't-ok'], 'AI Engineer @ PwC'],
                [['exp       ', 't-ok'], '2+ years'],
                [['stack     ', 't-ok'], 'Java · MERN · Python · GCP · AWS'],
                [['leetcode  ', 't-ok'], '1737 · top 10%'],
                [['cgpa      ', 't-ok'], '9.14'],
                [['uptime    ', 't-ok'], 'shipping since 2021']
            ];
            if (termBody.clientWidth < 600) {      // narrow screens: skip the logo so lines don't wrap
                info.forEach(function (row) { tLine(row); });
                return;
            }
            for (var i = 0; i < Math.max(art.length, info.length); i++) {
                tLine([[pad(art[i] || '', 24), 't-prompt']].concat(info[i] || []));
            }
        } },
        ls: { d: 'list files', run: function () {
            tLine([['about.txt  experience.log  projects/  skills.json  achievements.md  contact.vcf  ', 't-cmd'], ['resume.pdf', 't-accent']]);
        } },
        cat: { d: 'print a file (try: cat about.txt)', args: ['about.txt', 'experience.log', 'skills.json', 'achievements.md', 'contact.vcf', 'resume.pdf'], run: function (arg) {
            var map = { 'about.txt': 'about', 'experience.log': 'experience', 'skills.json': 'skills', 'achievements.md': 'achievements', 'contact.vcf': 'contact', 'resume.pdf': 'resume' };
            if (arg === 'projects' || arg === 'projects/') return tLine([['cat: projects/: Is a directory (try: projects)', 't-err']]);
            if (!map[arg]) return tLine([['cat: ' + (arg || '') + ': No such file (try: ls)', 't-err']]);
            termCommands[map[arg]].run();
        } },
        date: { d: 'current time in Indore', run: function () {
            tLine(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }) + ' IST');
        } },
        echo: { d: 'print text', run: function (arg, raw) { tLine(raw); } },
        history: { d: 'previous commands', run: function () { termHistory.forEach(function (h, i) { tLine([[pad(i + 1, 4), 't-dim'], h]); }); } },
        clear: { d: 'clear the screen', run: function () { termOut.textContent = ''; } },
        hire: { d: 'the best command', run: function () { hireMe(); } },
        sudo: { hidden: true, d: '', run: function (arg, raw) {
            if (/hire/.test(raw)) return hireMe();
            tLine([['Nice try. ', 't-err'], 'This incident will be reported to… nobody. Try ', ['sudo hire-tanish', 't-ok'], '.']);
        } },
        exit: { d: 'close the terminal', run: function () { termDlg.close(); } }
    };
    termCommands.quit = { hidden: true, d: '', run: termCommands.exit.run };
    termCommands.cls = { hidden: true, d: '', run: termCommands.clear.run };

    function hireMe() {
        tLine([['✔ ', 't-ok'], 'Permission granted. Excellent choice.']);
        tLine(['Reach Tanish at ', { link: 'mailto:' + PROFILE.email + '?subject=' + encodeURIComponent("Let's work together"), text: PROFILE.email }, ' or ', { link: PROFILE.linkedin, text: 'LinkedIn' }, '.']);
        confetti();
    }

    function runTerm(raw) {
        var input = raw.trim();
        tLine([['tanish@portfolio:~$ ', 't-prompt'], [input, 't-cmd']]);
        if (input) {
            termHistory.push(input);
            if (termHistory.length > 50) termHistory.shift();
        }
        histIdx = termHistory.length;
        if (!input) return scrollTerm();
        var parts = input.split(/\s+/);
        var name = parts[0].toLowerCase();
        var rest = input.slice(parts[0].length).trim();
        var cmd = termCommands[name];
        if (cmd) cmd.run((parts[1] || '').toLowerCase(), rest);
        else tLine([['command not found: ', 't-err'], name, '. Type ', ['help', 't-ok'], ' to see what I can do.']);
        tBlank();
        scrollTerm();
    }

    function completeTerm() {
        var val = termInput.value;
        var parts = val.split(/\s+/);
        var pool, prefix;
        if (parts.length <= 1) {
            pool = Object.keys(termCommands).filter(function (k) { return !termCommands[k].hidden; });
            prefix = parts[0].toLowerCase();
        } else {
            var c3 = termCommands[parts[0].toLowerCase()];
            pool = c3 && c3.args ? c3.args : [];
            prefix = parts[parts.length - 1].toLowerCase();
        }
        var hits = pool.filter(function (k) { return k.indexOf(prefix) === 0; });
        if (hits.length === 1) {
            parts[parts.length - 1] = hits[0];
            termInput.value = parts.join(' ') + ' ';
        } else if (hits.length > 1) {
            tLine([['tanish@portfolio:~$ ', 't-prompt'], [val, 't-cmd']]);
            tLine([[hits.join('   '), 't-dim']]);
            scrollTerm();
        }
    }

    function openTerminal() {
        if (!termDlg || !openDialog(termDlg)) return;
        if (!termBooted) {
            termBooted = true;
            tLine([['Welcome to ', 't-dim'], ['tanish@portfolio', 't-accent'], [' — an interactive tour of my work.', 't-dim']]);
            tLine([['Type ', 't-dim'], ['help', 't-ok'], [' to get started, or try ', 't-dim'], ['neofetch', 't-ok'], [', ', 't-dim'], ['projects', 't-ok'], [' or ', 't-dim'], ['sudo hire-tanish', 't-ok'], ['.', 't-dim']]);
            tBlank();
        }
        setTimeout(function () { termInput.focus(); }, 30);
        scrollTerm();
    }

    if (termDlg) {
        termForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var v = termInput.value;
            termInput.value = '';
            runTerm(v);
        });
        termInput.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') { e.preventDefault(); completeTerm(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); if (histIdx > 0) { histIdx--; termInput.value = termHistory[histIdx]; } }
            else if (e.key === 'ArrowDown') { e.preventDefault(); if (histIdx < termHistory.length - 1) { histIdx++; termInput.value = termHistory[histIdx]; } else { histIdx = termHistory.length; termInput.value = ''; } }
            else if (e.key.toLowerCase() === 'l' && e.ctrlKey) { e.preventDefault(); termOut.textContent = ''; }
        });
        termBody.addEventListener('click', function (e) { if (!e.target.closest('a') && !window.getSelection().toString()) termInput.focus(); });
        $('.term-close').addEventListener('click', function () { termDlg.close(); });
        $$('.term-open').forEach(function (b) { b.addEventListener('click', openTerminal); });
    }
    if (shortcutsDlg) $('.sc-close').addEventListener('click', function () { shortcutsDlg.close(); });

    /* ---------------------------------------------------------------
       Global keyboard shortcuts
       --------------------------------------------------------------- */
    var goPending = false, goTimer;
    var konami = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
    var konamiPos = 0;
    document.addEventListener('keydown', function (e) {
        var k = e.key.toLowerCase();
        konamiPos = k === konami[konamiPos] ? konamiPos + 1 : (k === konami[0] ? 1 : 0);
        if (konamiPos === konami.length) { konamiPos = 0; confetti(); toast('Konami code unlocked!'); }

        var typing = e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]');
        if (typing || e.metaKey || e.ctrlKey || e.altKey || $('dialog[open]')) return;
        if (goPending) {
            var map = { a: 'about', e: 'experience', p: 'projects', s: 'skills', c: 'contact', h: 'home' };
            goPending = false;
            clearTimeout(goTimer);
            if (map[k]) { e.preventDefault(); goTo(map[k]); }
            return;
        }
        if (e.key === '`') { e.preventDefault(); openTerminal(); }
        else if (e.key === '?') { e.preventDefault(); openDialog(shortcutsDlg); }
        else if (k === 't') { toggleTheme(); }
        else if (k === 'g') { goPending = true; goTimer = setTimeout(function () { goPending = false; }, 1200); }
    });
})();
