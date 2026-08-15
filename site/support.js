// ============================================================
// keepbreath.ing — support.js
// Author: Mark Thompson
// ============================================================


// ------------------------------------------------------------
// MATRIX RAIN
// Home page hero canvas — falling katakana columns
// ------------------------------------------------------------
function initMatrixRain() {
    var canvas = document.getElementById("matrix");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth - 264;
    canvas.height = window.innerHeight - 48;

    var CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
    var FONT_SIZE = 12;
    var cols = Math.floor(canvas.width / (FONT_SIZE - 1));
    var drops = [];
    for (var i = 0; i < cols; i++) drops[i] = Math.random() * -canvas.height;

    var stopped = false;
    var lastFrame = 0;
    var FRAME_DELAY = 50; /* ms between frames — higher = slower */

    function drawMatrix(now) {
        if (stopped) return;
        requestAnimationFrame(drawMatrix);
        if (now - lastFrame < FRAME_DELAY) return;
        lastFrame = now;
        ctx.fillStyle = "rgba(8, 9, 12, 0.04)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = FONT_SIZE + "px 'Noto Sans JP', 'JetBrains Mono', monospace";

        for (var i = 0; i < drops.length; i++) {
            var char = CHARS[Math.floor(Math.random() * CHARS.length)];
            /* Occasional magenta glyph, rest are cyan */
            var rnd = Math.random();
            ctx.fillStyle = rnd > 0.97 ? "#ff2e88" : rnd > 0.7 ? "#39ff14" : "#00ffd1";
            ctx.fillText(char, i * FONT_SIZE, drops[i] * FONT_SIZE);
            if (drops[i] * FONT_SIZE > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    }

    requestAnimationFrame(drawMatrix);

    /* Dim to background — keeps running behind page content */
    window._stopMatrix = function() {
        canvas.style.transition = "opacity 1.2s ease";
        canvas.style.opacity = "0.13";
    };
}


// ------------------------------------------------------------
// PHANTOM CODE
// Full-viewport background canvas — faint code snippets
// drifting upward across all pages
// ------------------------------------------------------------
function initPhantomCode() {
    (function () {
        var canvas = document.getElementById('phantom');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var FS = 13.5, LH = 18;
        var FONT = "500 " + FS + "px 'JetBrains Mono', ui-monospace, monospace";

        var SNIPPETS = [
            ["def traceroute(host):", "    for hop in range(1, 30):", "        yield probe(host, hop)"],
            ["const boot = async () => {", "  const me = await fetch('/api/me')", "  render(await me.json())", "}"],
            ["while breathing:", "    learn()", "    ship()", "    repeat()"],
            ["for pkt in capture:", "    if pkt.tcp and pkt.flags.syn:", "        analyze(pkt)"],
            ["if user.is_authenticated:", "    return redirect('/home')", "else:", "    raise Denied()"],
            ["class Node:", "    def __init__(self, ip):", "        self.ip = ip", "        self.up = True"],
            ["export const hop = (n) =>", "  Array.from({length: n},", "    (_, i) => i + 1)"],
            ["try:", "    connect(node)", "except TimeoutError:", "    backoff()"],
        ];

        var CTRL    = new Set(['if','else','elif','for','while','return','try','except','finally','raise','in','and','or','not','with','as','await','yield','break','continue','True','False','None']);
        var DECL    = new Set(['const','let','var','function','def','class','async','import','from','export','new','lambda']);
        var BUILTIN = new Set(['self','this','document','window','console','fetch','range','Array','Math','len','print','redirect','render','probe','connect','backoff','analyze']);

        function tokenize(line) {
            var re = /(\s+)|(#.*$|\/\/.*$)|("[^"]*"|'[^']*'|`[^`]*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)|([(){}\[\].,:;=<>+\-*/%&|!?]+)/g;
            var out = [], m;
            while ((m = re.exec(line))) {
                var c = '#d4d4d4';
                if (m[1]) { out.push({ t: m[0], c: null }); continue; }
                else if (m[2]) c = '#6a9955';
                else if (m[3]) c = '#ce9178';
                else if (m[4]) c = '#b5cea8';
                else if (m[5]) {
                    var w = m[5], after = line.slice(re.lastIndex);
                    if (CTRL.has(w)) c = '#c586c0';
                    else if (DECL.has(w)) c = '#569cd6';
                    else if (/^\s*\(/.test(after)) c = '#dcdcaa';
                    else if (BUILTIN.has(w)) c = '#4ec9b0';
                    else c = '#9cdcfe';
                } else if (m[6]) c = '#d4d4d4';
                out.push({ t: m[0], c: c });
            }
            return out;
        }

        function tokLines(lines) { return lines.map(tokenize); }

        var blocks = [], colX = [], spd = 0.30, lastW = -1, prevT = 0;

        function rebuild(w, h) {
            lastW = w;
            ctx.font = FONT;
            var maxW = 0;
            for (var si = 0; si < SNIPPETS.length; si++)
                for (var li = 0; li < SNIPPETS[si].length; li++)
                    maxW = Math.max(maxW, ctx.measureText(SNIPPETS[si][li]).width);
            var colW = maxW + 72;
            var cols = Math.max(1, Math.floor(w / colW));
            var pad = Math.max(8, (w - cols * colW) / 2);
            colX = [];
            for (var c = 0; c < cols; c++) colX.push(pad + c * colW);
            var pool = Math.min(cols * 2, 9);
            blocks = [];
            for (var k = 0; k < pool; k++)
                blocks.push({ state: 'wait', delay: Math.random() * 2200, col: 0, x: 0, y: 0, n: 0, tok: null,
                              baseA: 0.34, age: 0, fin: 0, hold: 0, fout: 0, life: 0, alpha: 0 });
            var seed = Math.min(cols, 3);
            for (var k = 0; k < seed; k++) {
                spawn(blocks[k], h);
                var b = blocks[k];
                if (b.state !== 'wait') b.age = b.fin + Math.random() * b.hold;
            }
        }

        function spawn(b, h) {
            var cols = colX.length;
            for (var a = 0; a < 7; a++) {
                var ci = Math.floor(Math.random() * cols);
                var si = Math.floor(Math.random() * SNIPPETS.length);
                var n = SNIPPETS[si].length, blockH = n * LH;
                var y = 24 + Math.random() * Math.max(20, h - 60 - blockH);
                var ok = true;
                for (var oi = 0; oi < blocks.length; oi++) {
                    var o = blocks[oi];
                    if (o === b || o.state === 'wait' || o.col !== ci) continue;
                    var oy = o.y, oh = o.n * LH;
                    if (!(y + blockH + 38 < oy || y > oy + oh + 38)) { ok = false; break; }
                }
                if (ok) {
                    b.state = 'live'; b.col = ci; b.x = colX[ci]; b.y = y; b.n = n;
                    b.tok = tokLines(SNIPPETS[si]);
                    b.baseA = 0.30 + Math.random() * 0.16;
                    b.age = 0;
                    b.fin = 700 + Math.random() * 600;
                    b.hold = 2600 + Math.random() * 3400;
                    b.fout = 1000 + Math.random() * 800;
                    b.life = b.fin + b.hold + b.fout;
                    return;
                }
            }
            b.delay = 250 + Math.random() * 700;
        }

        function frame(now) {
            requestAnimationFrame(frame);
            var w = window.innerWidth, h = window.innerHeight;
            if (!w || !h) return;
            if (canvas.width !== w) canvas.width = w;
            if (canvas.height !== h) canvas.height = h;
            if (!blocks.length || lastW !== w) rebuild(w, h);

            var dt = prevT ? Math.min(64, now - prevT) : 16; prevT = now;
            var ds = dt / 16.7;

            ctx.clearRect(0, 0, w, h);
            ctx.font = FONT;
            ctx.textBaseline = 'alphabetic';

            var bar = document.querySelector('[data-scan]');
            var scanC = -9999;
            if (bar) { var r = bar.getBoundingClientRect(); scanC = r.top + r.height / 2; }
            var lit = LH * 0.62;

            for (var bi = 0; bi < blocks.length; bi++) {
                var b = blocks[bi];
                if (b.state === 'wait') { b.delay -= dt; if (b.delay <= 0) spawn(b, h); continue; }
                b.age += dt;
                b.y -= spd * ds;
                if (b.age < b.fin)               b.alpha = b.baseA * (b.age / b.fin);
                else if (b.age < b.fin + b.hold) b.alpha = b.baseA;
                else if (b.age < b.life)         b.alpha = b.baseA * (1 - (b.age - b.fin - b.hold) / b.fout);
                else { b.state = 'wait'; b.delay = 1400 + Math.random() * 4200; b.alpha = 0; continue; }
                if (b.alpha <= 0.01 || !b.tok) continue;

                for (var j = 0; j < b.tok.length; j++) {
                    var ly = b.y + j * LH;
                    var dist = Math.abs(ly - scanC);
                    var on = dist < lit;
                    var e = on ? (1 - dist / lit) : 0;
                    var x = b.x;
                    for (var ti = 0; ti < b.tok[j].length; ti++) {
                        var tk = b.tok[j][ti];
                        var wdt = ctx.measureText(tk.t).width;
                        if (tk.t.trim() !== '') {
                            ctx.fillStyle = tk.c;
                            if (on) {
                                ctx.globalAlpha = Math.max(b.alpha, e);
                                ctx.shadowColor = tk.c; ctx.shadowBlur = 9 * e;
                                ctx.fillText(tk.t, x, ly);
                                if (e > 0.45) { ctx.shadowBlur = 15 * e; ctx.fillText(tk.t, x, ly); }
                                ctx.shadowBlur = 0;
                            } else {
                                ctx.globalAlpha = b.alpha;
                                ctx.fillText(tk.t, x, ly);
                            }
                        }
                        x += wdt;
                    }
                }
            }
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        }
        requestAnimationFrame(frame);
    })();
}


// ------------------------------------------------------------
// SCAN LINE
// Cyan bar sweeping top to bottom, lights up phantom code
// as it passes
// ------------------------------------------------------------


// ------------------------------------------------------------
// CRT GLITCH
// Periodic analog shimmer — horizontal jitter, RGB split,
// slight skew — fires randomly to feel organic
// ------------------------------------------------------------
function crtGlitch() {
    var body = document.body;
    body.classList.add("glitching");
    setTimeout(function() {
        body.classList.remove("glitching");
        /* Occasionally double-glitch */
        if (Math.random() > 0.85) {
            setTimeout(function() {
                body.classList.add("glitching");
                setTimeout(function() {
                    body.classList.remove("glitching");
                    scheduleNextGlitch();
                }, 400);
            }, 150);
        } else {
            scheduleNextGlitch();
        }
    }, 400);
}

function scheduleNextGlitch() {
    var nextDelay = 14000 + Math.random() * 10000;
    setTimeout(function() {
        crtGlitch();
    }, nextDelay);
}



// ------------------------------------------------------------
// BOOT SEQUENCE
// Terminal-style SSH connection animation on home page load
// ------------------------------------------------------------
function bootSequence() {
    var lines = [
        "connecting to keepbreath.ing...",
        "signal acquired.",
        "[ ok ] establishing secure connection...",
        "[ ok ] authenticating user...",
        "[ ok ] loading environment...",
        "[ ok ] mounting file system...",
        "[ ok ] initializing session...",
        "connection established.",
    ];

    /* Each line gets its own delay — some tasks take longer than others */
    var lineDelays = [0, 700, 1100, 3800, 4400, 5000, 6800, 7600];

    for (var i = 0; i < lines.length; i++) {
        (function(index) {
            setTimeout(function() {
                var p = document.createElement("p");
                if (lines[index].indexOf("[ ok ]") !== -1) {
                    p.innerHTML = lines[index].replace("[ ok ]", "<span class='ok'>[ ok ]</span>");
                } else {
                    p.textContent = lines[index];
                }
                document.getElementById("boot").appendChild(p);
            }, lineDelays[index]);
        })(i);
    }

    /* After last line, show prompt then type command */
    var promptDelay = 8400;
    setTimeout(function() {
        var boot = document.getElementById("boot");

        /* Show prompt */
        var prompt = document.createElement("p");
        prompt.className = "boot-prompt";
        prompt.innerHTML = "mark@keepbreath.ing:~$ <span class='boot-command' id='boot-cmd'></span><span class='caret'>▋</span>";
        boot.appendChild(prompt);

        /* Type command with varied timing and occasional pauses */
        var command = "./init --load-session";
        var cmdEl = document.getElementById("boot-cmd");
        var charIndex = 0;

        function typeNextChar() {
            if (charIndex < command.length) {
                cmdEl.textContent += command[charIndex];
                charIndex++;
                /* Occasional longer pause — hesitation on space or dash */
                var ch = command[charIndex - 1];
                var pause = (ch === ' ')
                    ? 300 + Math.random() * 400
                    : (ch === '-')
                    ? 200 + Math.random() * 300
                    : 70 + Math.random() * 60;
                setTimeout(typeNextChar, pause);
            } else {
                /* Done typing — pause then show response */
                setTimeout(function() {
                    var resp = document.createElement("p");
                    resp.className = "ok";
                    resp.textContent = "session loaded. welcome.";
                    boot.appendChild(resp);

                    /* Fade out matrix rain, then reveal page content */
                    setTimeout(function() {
                        if (window._stopMatrix) window._stopMatrix();

                        setTimeout(function() {
                            var content = document.getElementById("page-content");
                            content.classList.remove("hidden");
                            content.classList.add("visible");

                            /* Fire phantom code CRT power-on slightly after content */
                            setTimeout(function() {
                                var phantom = document.getElementById("phantom");
                                if (phantom) {
                                    phantom.style.animation = "crt-power-on 3s steps(12) forwards";
                                }
                            }, 800);
                        }, 900);
                    }, 600);
                }, 500);
            }
        }

        typeNextChar();
    }, promptDelay);
}

// ------------------------------------------------------------
// BLOG FILTER
// Tag chip filter — array, loop, conditional (rubric req.)
// ------------------------------------------------------------


// ------------------------------------------------------------
// XSS DEMO
// Contact page live preview — vulnerable vs. safe mode toggle
// ------------------------------------------------------------


// ------------------------------------------------------------
// INIT
// Boot each feature based on what elements exist on the page
// ------------------------------------------------------------
function startClock() {
    var now = new Date();
    var timeStr = now.toLocaleTimeString();
    document.getElementById('clock').textContent = timeStr;
}

startClock();
if (document.getElementById("boot")) {
    bootSequence();
} else {
    var phantom = document.getElementById("phantom");
    if (phantom) phantom.style.opacity = "1";
}
setInterval(startClock, 1000);

/* System uptime counter — running since July 19, 1979 */
function updateUptime() {
    var birth = new Date("July 19, 1979 00:00:00");
    var now = new Date();
    var diff = now - birth;
    var years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    var days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    var secs = Math.floor((diff % (1000 * 60)) / 1000);
    var el = document.getElementById("uptime-counter");
    if (el) el.textContent = years + "y " + days + "d " + hours + "h " + mins + "m " + secs + "s";
}

/* Graduation countdown — December 11, 2026 */
function updateGradCountdown() {
    var grad = new Date("December 11, 2026 14:00:00");
    var now = new Date();
    var diff = grad - now;
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var el = document.getElementById("grad-counter");
    if (el) el.textContent = days + " days";
}

/* GitHub total commits across all public repos */
function fetchGithubCommits() {
    var repos = ["sh4i-yurei"];
    var total = 0;
    var repoList;
    fetch("https://api.github.com/users/sh4i-yurei/repos")
        .then(function(r) { return r.json(); })
        .then(function(repos) {
            var promises = repos.map(function(repo) {
                return fetch("https://api.github.com/repos/sh4i-yurei/" + repo.name + "/commits?per_page=1&page=1")
                    .then(function(r) {
                        var link = r.headers.get("Link");
                        if (link) {
                            var match = link.match(/page=(\d+)>; rel="last"/);
                            return match ? parseInt(match[1]) : 1;
                        }
                        return 1;
                    });
            });
            return Promise.all(promises);
        })
        .then(function(counts) {
            var total = counts.reduce(function(a, b) { return a + b; }, 0);
            var el = document.getElementById("github-commits");
            if (el) el.textContent = total;
        })
        .catch(function() {
            var el = document.getElementById("github-commits");
            if (el) el.textContent = "—";
        });
}

// ------------------------------------------------------------
// BLOG FILTER
// Filter the post list by tag. Each post carries a data-tags
// list; clicking a filter button shows only the posts that
// carry that tag ("all" shows everything).
// ------------------------------------------------------------
function initBlogFilter() {
    var bar = document.getElementById('blog-filters');
    if (!bar) return;                                   // not on the blog page

    var buttons = bar.querySelectorAll('.filter-btn');
    var posts = document.querySelectorAll('.blog-list .post-item');
    var countEl = document.getElementById('filter-count');

    // Show the posts matching `filter`, hide the rest, update the count.
    function applyFilter(filter) {
        var shown = 0;

        for (var i = 0; i < posts.length; i++) {
            var tags = posts[i].getAttribute('data-tags').split(' ');
            var match = false;

            if (filter === 'all') {
                match = true;
            } else {
                for (var j = 0; j < tags.length; j++) {
                    if (tags[j] === filter) {
                        match = true;
                        break;
                    }
                }
            }

            if (match) {
                posts[i].classList.remove('is-hidden');
                shown++;
            } else {
                posts[i].classList.add('is-hidden');
            }
        }

        if (countEl) {
            countEl.textContent = shown + (shown === 1 ? ' post' : ' posts');
        }
    }

    // Wire each button: highlight it, un-highlight the others, filter.
    for (var k = 0; k < buttons.length; k++) {
        buttons[k].addEventListener('click', function () {
            for (var m = 0; m < buttons.length; m++) {
                buttons[m].classList.remove('active');
            }
            this.classList.add('active');
            applyFilter(this.getAttribute('data-filter'));
        });
    }

    applyFilter('all');                                 // initial state
}

// ------------------------------------------------------------
// BLOG ACCORDION
// Clicking a post row expands its body in place. Landing on
// blog.html#<id> (e.g. from a project link) opens that post
// and scrolls to it.
// ------------------------------------------------------------
function initBlogAccordion() {
    var list = document.querySelector('.blog-list');
    if (!list) return;                                  // not on the blog page

    var rows = list.querySelectorAll('.post-row');

    for (var i = 0; i < rows.length; i++) {
        rows[i].addEventListener('click', function () {
            var item = this.parentNode;                 // the .post-item
            var isOpen = item.classList.toggle('open');
            this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    }

    // Deep link: open and scroll to the post named in the URL hash.
    if (location.hash.length > 1) {
        var target = document.getElementById(location.hash.slice(1));
        if (target && target.classList.contains('post-item')) {
            target.classList.add('open');
            var btn = target.querySelector('.post-row');
            if (btn) btn.setAttribute('aria-expanded', 'true');
            target.scrollIntoView();
        }
    }
}
// ------------------------------------------------------------
// CONTACT FORM
// Submits to the /api/contact backend with fetch and renders the result with
// textContent (never innerHTML). The invisible ALTCHA widget solves a proof-of-
// work on submit; its token + the honeypot field ride along in the request body.
// ------------------------------------------------------------
function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var out = document.getElementById('cf-result');
    var button = form.querySelector('button[type="submit"]');
    var widget = document.querySelector('altcha-widget');
    var sending = false;

    // Write a status message safely — textContent, never innerHTML.
    function setResult(message, ok) {
        out.textContent = message;
        out.className = message ? (ok ? 'cf-ok' : 'cf-error') : '';
    }

    // Resolve the ALTCHA token: if the widget hasn't produced one yet, trigger it
    // and wait for its "verified" event (with a timeout so a submit never hangs).
    function getAltchaToken() {
        var field = form.querySelector('input[name="altcha"]');
        if (field && field.value) return Promise.resolve(field.value);
        return new Promise(function (resolve, reject) {
            if (!widget) { reject(new Error('altcha widget missing')); return; }
            var timer = setTimeout(function () {
                widget.removeEventListener('verified', onVerified);
                reject(new Error('altcha timeout'));
            }, 15000);
            function onVerified() {
                clearTimeout(timer);
                widget.removeEventListener('verified', onVerified);
                var f = form.querySelector('input[name="altcha"]');
                resolve(f ? f.value : '');
            }
            widget.addEventListener('verified', onVerified);
            if (typeof widget.verify === 'function') widget.verify();
        });
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (sending) return;
        sending = true;
        var originalLabel = button.textContent;
        button.disabled = true;
        button.textContent = 'sending…';
        setResult('', true);

        try {
            var token = await getAltchaToken();
            var payload = {
                name: document.getElementById('cf-name').value,
                email: document.getElementById('cf-email').value,
                message: document.getElementById('cf-message').value,
                website: document.getElementById('cf-website').value, // honeypot
                altcha: token
            };
            var res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            var data = await res.json().catch(function () { return {}; });
            if (res.ok && data.ok) {
                setResult('Thanks — your message has been sent.', true);
                form.reset();
            } else {
                setResult(data.error || 'Something went wrong. Please try again.', false);
            }
        } catch (err) {
            setResult('Could not send right now. Please try again.', false);
        } finally {
            // reset the widget so the next submit solves a fresh, single-use challenge
            if (widget && typeof widget.reset === 'function') widget.reset();
            sending = false;
            button.disabled = false;
            button.textContent = originalLabel;
        }
    });
}

updateUptime();
updateGradCountdown();
fetchGithubCommits();
initMatrixRain();
initPhantomCode();
initBlogFilter();
initBlogAccordion();
initContactForm();
setInterval(updateUptime, 1000);
setInterval(updateGradCountdown, 60000);
scheduleNextGlitch();
