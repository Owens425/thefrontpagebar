/* The Front Page Bar, Ballymena. Everything degrades: with JS off the whole
   site still reads and every link works. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* The turn is a CSS animation that has already started by the time this
     runs. All that is left is to remember it, so the next page in this
     session skips it before it paints. A refresh clears it again. */
  var turning = !reduce && !!document.getElementById("flip") &&
                !document.documentElement.classList.contains("no-turn");
  try { sessionStorage.setItem("fp-turned", "1"); } catch (e) {}

  /* Work that has no business competing with the intro for frames. Anything
     passed here runs straight away on a page with no intro, and otherwise
     waits until the paper has cleared. Note this defers WORK, never content:
     the page is in the document and usable from the first frame either way. */
  var INTRO_DONE = 4900;
  window.__fpAfterIntro = function (fn) {
    if (!turning) { fn(); return; }
    setTimeout(fn, INTRO_DONE);
  };
  if (!turning) {
    document.documentElement.classList.remove("fp-intro");
  } else {
    setTimeout(function () {
      document.documentElement.classList.remove("fp-intro");
    }, INTRO_DONE);
  }

  /* Put the name printed on the front page exactly over the real masthead.
     Measured rather than guessed: the zoom then brings the two into register
     on its own, and the handover is a fade with nothing moving. Called again
     from the nameplate module once that has sized the real one. */
  window.__fpAlignMast = function () {
    var flipEl = document.getElementById("flip");
    var host = document.querySelector(".flip__mast");
    /* Scoped. The clone this function makes is itself a .mast__name and it
       sits earlier in the document than the real masthead, so an unscoped
       query returns the clone and the function starts measuring its own
       output. It walked the nameplate two thirds of the way down the page
       before anybody noticed. */
    /* The whole newspaper part of the masthead, not just the logo: the
       address line, the double rules, the logo board and the standfirst.
       Printed on the front page like that, the logo is the paper's own
       masthead instead of a box laid over its columns. */
    var real = document.querySelector(".mast .sheet");
    if (!flipEl || !host || !real) { return; }
    var fr = flipEl.getBoundingClientRect(), rr = real.getBoundingClientRect();
    if (!rr.width) { return; }
    host.style.left = Math.round(rr.left - fr.left) + "px";
    host.style.top = Math.round(rr.top - fr.top) + "px";
    host.style.width = Math.round(rr.width) + "px";

    /* Clone the masthead rather than rebuild it. A hand made copy drifts
       the moment the real one is restyled, and nobody notices until the
       name jumps at the handover. Taken once, while the original is still
       solid, and only repositioned after that. The menu and the opening
       hours line are the website, not the newspaper, so they come out. */
    if (!host.firstChild) {
      var copy = real.cloneNode(true);
      [].forEach.call(copy.querySelectorAll(".nav, .status"), function (n) {
        n.parentNode.removeChild(n);
      });
      [].forEach.call(copy.querySelectorAll("[id]"), function (n) { n.removeAttribute("id"); });
      [].forEach.call(copy.querySelectorAll("a"), function (a) {
        a.removeAttribute("href");       /* not second links to anything */
        a.setAttribute("tabindex", "-1");
      });
      copy.setAttribute("aria-hidden", "true");
      host.appendChild(copy);
    }

    /* and the front page's columns start under it, the way a paper's do */
    var rules = real.querySelectorAll(".rule--d");
    var end = rules.length ? rules[rules.length - 1].getBoundingClientRect().bottom : rr.bottom;
    host.parentNode.style.setProperty("--mast-clear", Math.round(end - fr.top + 22) + "px");
  };

  if (turning) {
    /* Align once the fonts are in, and again well before the front page is
       needed at 2200ms. The masthead settles a little after the first call
       (measured: 4px across, 11px down), and the front page has no use for
       the number until the zoom lands, so the later reading is the one that
       counts. */
    setTimeout(function () { window.__fpAlignMast(); }, 1200);
    window.addEventListener("resize", function () {
      window.__fpAlignMast();
    }, { passive: true });

    /* The CSS gets it out of sight on its own. This takes the four sheets
       and their few hundred bars out of the document altogether, once they
       have finished and nobody is looking at them. */
    setTimeout(function () {
      var el = document.getElementById("flip");
      if (el && el.parentNode) { el.parentNode.removeChild(el); }
    }, 5300);
  }

  /* ---------------------------------------------------------------- events
     The listings carry real dates, so mark what has been and what is next
     at runtime. That keeps the page honest without needing a rebuild. */
  (function () {
    var bills = [].slice.call(document.querySelectorAll(".bill[data-date]"));
    if (!bills.length) return;
    bills.forEach(function (li, i) { li.style.setProperty("--i", i); });
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
                "Saturday"];
    var nextFound = false;

    /* Where the gig sits in time, in the words somebody would actually use.
       Worked out here rather than at build time: the page is static and may
       sit untouched for weeks, so a baked-in "This Saturday" would go stale
       and start lying. Nothing past a week out gets a day name, because
       "next Saturday" means two different things to different people. */
    function status(d, days, time) {
      if (days < 0) return "Been and gone";
      if (days === 0) {
        var h = time ? +time.split(":")[0] : 0;
        return h >= 17 ? "Tonight" : "Today";
      }
      if (days === 1) return "Tomorrow";
      if (days <= 6) return "This " + DAYS[d.getDay()];
      return "Coming soon";
    }

    bills.forEach(function (li) {
      var parts = li.getAttribute("data-date").split("-");
      var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      var days = Math.round((d - today) / 86400000);
      var tag = li.querySelector(".bill__status");
      if (tag) tag.textContent = status(d, days, li.getAttribute("data-time"));
      if (days < 0) {
        li.classList.add("is-past");
      } else if (!nextFound) {
        nextFound = true;
        li.classList.add("is-next");
      }
    });
  })();

  /* -------------------------------------------------------------- feature
     The box for a special night carries its own leaving date, so a page
     that has not been rebuilt since still drops it the morning after. */
  (function () {
    var t = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    var iso = t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
    [].forEach.call(document.querySelectorAll("[data-until]"), function (el) {
      if (iso >= el.getAttribute("data-until")) { el.hidden = true; }
    });
  })();

  /* ------------------------------------------------------------ stop press
     Is anything on tonight? Answered from the listings already in the page
     and the hours already handed to us, so there is no second copy of the
     data to drift, and a static page cannot go stale on it. Sits before the
     reveal module on purpose: it unhides the box, and an element that is
     still hidden when the observer is wired up never reveals. */
  (function () {
    var sec = document.getElementById("tonight");
    if (!sec) return;
    var head = sec.querySelector("[data-tonight-head]");
    var sub = sec.querySelector("[data-tonight-sub]");
    var kick = sec.querySelector("[data-tonight-kick]");
    var box = sec.querySelector("[data-tonight]");
    var bills = [].slice.call(document.querySelectorAll(".bill[data-date]"));
    if (!head || !sub || !bills.length) return;

    var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
                "Friday", "Saturday"];
    var MONTHS = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November",
                  "December"];

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function isoOf(d) {
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }
    function pretty(iso) {
      var b = iso.split("-");
      var d = new Date(+b[0], +b[1] - 1, +b[2]);
      return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
    }
    function clock(hhmm) {
      var b = hhmm.split(":"), h = +b[0], m = b[1];
      if (h === 0 && m === "00") return "midnight";
      if (h === 12 && m === "00") return "noon";
      return (h % 12 || 12) + (m === "00" ? "" : "." + m) + (h < 12 ? "am" : "pm");
    }
    function titleOf(li) {
      var el = li.querySelector(".bill__t");
      return el ? el.textContent.trim() : "";
    }
    function subOf(li) {
      var el = li.querySelector(".bill__sub");
      return el ? el.textContent.trim() : "";
    }
    function kindOf(li) {
      var el = li.querySelector(".bill__kind");
      return el ? el.textContent.trim().toLowerCase() : "";
    }

    function paint() {
      var now = new Date();
      var iso = isoOf(now);
      var mins = now.getHours() * 60 + now.getMinutes();

      /* open or shut, worked out the same way as the masthead chip */
      var keys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      var H = window.FP_HOURS || {};
      var slot = H[keys[now.getDay()]];
      var openNow = false, openLine = "";
      if (!slot) {
        openLine = "The bar is shut today.";
      } else {
        var o = (+slot[0].split(":")[0]) * 60 + (+slot[0].split(":")[1]);
        var c = (+slot[1].split(":")[0]) * 60 + (+slot[1].split(":")[1]);
        if (c < o) c += 1440;
        openNow = mins >= o && mins < c;
        openLine = openNow
          ? "The bar is open until " + clock(slot[1]) + "."
          : "The bar opens at " + clock(slot[0]) + ".";
      }

      /* With two acts on one night (Halloween: a band at 5, a DJ at 9) the
         box talks about whichever has started most recently, or the first if
         neither has, and names the later one so nobody leaves at 8. */
      var todays = null, later = null, next = null, i;
      function startOf(li) {
        var t = (li.getAttribute("data-time") || "17:00").split(":");
        return +t[0] * 60 + (+t[1] || 0);
      }
      for (i = 0; i < bills.length; i++) {
        var d = bills[i].getAttribute("data-date");
        if (d === iso) {
          if (!todays || startOf(bills[i]) <= mins) { todays = bills[i]; }
        }
        else if (d > iso && !next) { next = bills[i]; }
      }
      if (todays) {
        for (i = 0; i < bills.length; i++) {
          if (bills[i].getAttribute("data-date") === iso &&
              startOf(bills[i]) > startOf(todays)) { later = bills[i]; break; }
        }
      }
      var nextLine = "";
      if (later) {
        nextLine = "Then " + titleOf(later) + " from " + clock(later.getAttribute("data-time")) + ".";
      } else if (next) {
        nextLine = "Next: " + titleOf(next) + ", " +
                   pretty(next.getAttribute("data-date")) + " at " +
                   clock(next.getAttribute("data-time")) + ".";
      }

      var label = "Tonight", h, p;
      if (todays) {
        var hm = (todays.getAttribute("data-time") || "17:00").split(":");
        var startMin = +hm[0] * 60 + (+hm[1] || 0);
        var nowMin = now.getHours() * 60 + now.getMinutes();
        var started = nowMin >= startMin;
        var over = nowMin >= startMin + 5 * 60;
        var kind = kindOf(todays);
        var when = clock(todays.getAttribute("data-time"));
        var who = titleOf(todays);
        var cause = subOf(todays);

        if (kind === "quiz") {
          h = over ? "Quiz is over" : (started ? "Quiz on now" : "Charity quiz tonight");
          /* The cause is written "In aid of ..." in the listing. The price and
             team size, where the poster gave them, are the line under it. */
          if (/^in aid of /i.test(cause)) cause = cause.replace(/^in aid of /i, "");
          var note = todays.querySelector(".bill__note");
          p = "From " + when + (cause ? ", in aid of " + cause : "") + "." +
              (note ? " " + note.textContent.trim() : "");
        } else if (kind === "dj") {
          h = over ? "DJ finished" : (started ? "DJ on now" : "DJ tonight");
          p = who + " on the decks from " + when + ".";
        } else if (kind === "session") {
          label = "Today";
          h = over ? "Open mic finished" : (started ? "Open mic on now" : "Open mic today");
          p = "From " + when + ". Free in, players welcome.";
        } else {
          h = over ? "Music finished" : (started ? "Music on now" : "Music tonight");
          p = who + ", from " + when +
              ". Free in, no ticket, first come first served for a seat.";
        }
        if ((over || later) && nextLine) { p += " " + nextLine; }
        if (over) { label = "Tonight, already been"; }
        if (started && !over) { box.classList.add("is-on"); }
        else { box.classList.remove("is-on"); }
      } else {
        box.classList.remove("is-on");
        if (!slot) {
          h = "Closed today";
          p = "The bar is shut today. " + nextLine;
        } else {
          h = "No music tonight";
          p = openLine + (nextLine ? " " + nextLine : "");
        }
      }

      if (kick) kick.textContent = label;
      head.textContent = h;
      sub.textContent = p;

      /* Revealing this box moves the ticker down, and the opening animation
         sized itself to where the ticker was at parse time, which was 232px
         too high. Re-measure once, then tell the nameplate to re-register. */
      var first = sec.hidden;
      sec.hidden = false;
      if (first) {
        var fl = document.getElementById("flip");
        var tk = document.querySelector(".ticker");
        if (fl && tk) {
          fl.style.height =
            Math.round(tk.getBoundingClientRect().top + window.pageYOffset) + "px";
        }
        if (window.__fpAlignMast) { window.__fpAlignMast(); }
      }
    }

    paint();
    /* One paint now, because the box has to be right the moment it is seen.
       The minute hand can wait. */
    window.__fpAfterIntro(function () { setInterval(paint, 60000); });
  })();

  /* ---------------------------------------------------------------- hours chip */
  (function () {
    var chip = document.querySelector("[data-hours]");
    if (!chip) return;
    var HOURS = window.FP_HOURS;
    if (!HOURS) return;
    function pretty(hhmm) {
      var bits = hhmm.split(":"), h = +bits[0], m = bits[1];
      if (h === 0 && m === "00") return "midnight";
      if (h === 12 && m === "00") return "noon";
      return (h % 12 || 12) + (m === "00" ? "" : "." + m) + (h < 12 ? "am" : "pm");
    }
    var keys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var now = new Date();
    var slot = HOURS[keys[now.getDay()]];
    var t = chip.querySelector(".status__t");
    var x = chip.querySelector(".status__x");
    if (!slot) {
      t.textContent = "Closed today";
    } else {
      var mins = now.getHours() * 60 + now.getMinutes();
      var o = (+slot[0].split(":")[0]) * 60 + (+slot[0].split(":")[1]);
      var c = (+slot[1].split(":")[0]) * 60 + (+slot[1].split(":")[1]);
      if (c < o) c += 1440;
      var open = mins >= o && mins < c;
      t.textContent = open ? "Open now" : "Closed";
      x.textContent = open ? "Until " + pretty(slot[1]) : "Opens " + pretty(slot[0]);
    }
    chip.hidden = false;
  })();

  /* ---------------------------------------------------------------- drawer */
  (function () {
    var burger = document.getElementById("burger");
    var drawer = document.getElementById("drawer");
    if (!burger || !drawer) return;
    var closeBtn = document.getElementById("drawerClose");
    var lastFocus = null;

    function focusables() {
      return [].slice.call(drawer.querySelectorAll("a[href], button:not([disabled])"))
        .filter(function (el) { return el.offsetParent !== null; });
    }
    function open() {
      lastFocus = document.activeElement;
      drawer.hidden = false;
      burger.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      var f = focusables();
      if (f.length) f[0].focus();
      document.addEventListener("keydown", onKey);
    }
    function close() {
      drawer.hidden = true;
      burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      if (lastFocus) lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    burger.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    drawer.addEventListener("click", function (e) { if (e.target === drawer) close(); });
  })();

  /* ---------------------------------------------------------------- reveals */
  (function () {
    /* Blocks that fade up as a whole. Covers the inner pages too: they use a
       .head block rather than the front page's .lead. */
    var SIMPLE = ".band .desk, " +
                 ".head h1, .head__sub, .head__kick, " +
                 ".lead__kick, .lead__h, .lead__sub, .lead__cta, " +
                 ".box, .strip__h, .strip__cta, .bills__head, .press__box, " +
                 ".split > *, p.more, .band > .sheet > .note";

    /* Containers whose children come in one after another. */
    var STAGGER = ".bills, .weeks, .awards, .qas, .form, .prose, .says, .menu";

    var targets = [].slice.call(document.querySelectorAll(SIMPLE));

    [].slice.call(document.querySelectorAll(STAGGER)).forEach(function (box) {
      if (targets.indexOf(box) === -1) targets.push(box);
      box.setAttribute("data-stagger", "");
      var i = 0;
      [].slice.call(box.children).forEach(function (kid) {
        /* Hidden inputs and the honeypot are children too. Counting them would
           push the first visible field back by a few hundred milliseconds. */
        if (kid.hidden || kid.type === "hidden" || kid.classList.contains("hp")) return;
        kid.style.setProperty("--i", i);
        i++;
      });
    });

    if (!targets.length) return;
    targets.forEach(function (el) { el.setAttribute("data-reveal", ""); });
    if (reduce || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -60px 0px", threshold: 0 });
    /* Held back until the intro is done. The blocks are already marked and
       already at opacity zero, so nothing flashes: they simply begin to arrive
       as the newspaper clears rather than transitioning behind it. */
    window.__fpAfterIntro(function () {
      targets.forEach(function (el) { io.observe(el); });
    });

    /* Safety net. If anything is still hidden after a few seconds, show it.
       A client demo must never end up looking at an empty band because an
       observer did not fire. */
    setTimeout(function () {
      targets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in");
      });
    }, 2500);
  })();

  /* ---------------------------------------------------------------- accordion */
  (function () {
    [].slice.call(document.querySelectorAll(".qa__q")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        if (panel) panel.hidden = open;
      });
    });
  })();

  /* ---------------------------------------------------------------- form */
  (function () {
    var form = document.getElementById("form");
    if (!form) return;

    /* A button elsewhere on the site can send people here with the subject
       already picked: contact.html?topic=lounge chooses "Booking the karaoke
       lounge". The message box then says what the bar will need to know, and
       the email's subject line says what it is about before it is opened. */
    var topic = document.getElementById("topic");
    var box = document.getElementById("message");
    var subj = form.querySelector("[name=subject]");
    function pick() {
      var o = topic.options[topic.selectedIndex];
      if (box) box.placeholder = (o && o.getAttribute("data-hint")) || "";
      if (subj && o) subj.value = "Front Page website: " + o.text;
    }
    if (topic) {
      var want = (location.search.match(/[?&]topic=([a-z]+)/) || [])[1];
      [].forEach.call(topic.options, function (o, i) {
        if (want && o.getAttribute("data-topic") === want) topic.selectedIndex = i;
      });
      topic.addEventListener("change", pick);
      pick();
    }
    var note = document.getElementById("formnote");
    var key = form.querySelector("[name=access_key]");
    var live = key && key.value && key.value.indexOf("REPLACE") !== 0;

    if (!live) {
      console.warn("Front Page: web3forms access_key is a placeholder, so the form " +
                   "cannot deliver. Generate a key against the bar's own inbox at " +
                   "web3forms.com and put it in tools/data.py.");
    }

    function setErr(name, msg) {
      var el = form.querySelector('.err[data-for="' + name + '"]');
      if (el) el.textContent = msg || "";
      var input = form.querySelector("#" + name);
      if (input) {
        if (msg) input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
      }
    }

    function validate() {
      var ok = true;
      var name = form.querySelector("#name");
      var email = form.querySelector("#email");
      var msg = form.querySelector("#message");
      setErr("name", ""); setErr("email", ""); setErr("message", "");
      if (!name.value.trim()) { setErr("name", "Put your name in"); ok = false; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) {
        setErr("email", "That email does not look right"); ok = false;
      }
      if (msg.value.trim().length < 5) { setErr("message", "Say a wee bit more"); ok = false; }
      if (!ok) {
        var bad = form.querySelector("[aria-invalid=true]");
        if (bad) bad.focus();
      }
      return ok;
    }

    form.addEventListener("submit", function (e) {
      if (!validate()) { e.preventDefault(); return; }
      if (!live) {
        e.preventDefault();
        if (note) {
          note.innerHTML = "The form is not connected yet. Ring " +
            '<a href="tel:' + (form.dataset.tel || "") + '">' +
            (form.dataset.phone || "the bar") + "</a> or " +
            '<a href="' + (form.dataset.fb || "#") + '" target="_blank" rel="noopener">' +
            "message on Facebook</a>, and it reaches the same place.";
          note.setAttribute("role", "status");
        }
        return;
      }
      if (note) note.textContent = "Sending...";
    });
  })();
  /* ------------------------------------------------------- running head
     A newspaper carries a running head on every page after the front one.
     This one appears once the nameplate has scrolled away, and carries a
     hairline progress rule along its bottom edge. */
  (function () {
    var bar = document.getElementById("runhead");
    var prog = document.getElementById("progress");
    var mast = document.querySelector(".mast");
    if (!bar || !mast) return;

    var burger2 = document.getElementById("burger2");
    if (burger2) {
      burger2.addEventListener("click", function () {
        var real = document.getElementById("burger");
        if (real) real.click();
      });
    }

    var trigger = 0, ticking = false, shown = false;

    function measure() {
      trigger = mast.offsetHeight - 40;
    }

    function frame() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop;

      var want = y > trigger;
      if (want !== shown) {
        shown = want;
        bar.classList.toggle("on", want);
      }

      if (prog) {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        var pct = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        prog.style.transform = "scaleX(" + pct.toFixed(4) + ")";
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(frame);
    }

    measure();
    frame();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { measure(); frame(); }, { passive: true });
  })();

  /* ------------------------------------------------- anchor links only
     Smooth is applied here rather than in CSS, so it never touches the
     mouse wheel, and so it can respect the reduced-motion setting. */
  (function () {
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute("href").slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  })();

  /* ------------------------------------------------------- the nameplate
     The pub's logo, traced into shapes so it can be drawn on the way the
     typeset nameplate was. Once per visit: black and white in the opening
     newspaper, then the moment the paper goes the board is in colour and the
     logo draws itself on across it with a pen.
     It is on every page, so redrawing it every time would wear thin fast. */
  (function () {
    /* Scoped to the masthead. A clone of this whole node sits inside the
       opening animation, earlier in the document, and an unscoped query
       would find that one instead. */
    var plate = document.querySelector(".mast .plate--logo");
    if (!plate) return;
    var g = plate.querySelector(".plate__g");
    var board = plate.parentNode;
    if (!g || !board) return;

    var SEEN = "fp-plate-drawn";
    var alreadySeen = false;
    try { alreadySeen = sessionStorage.getItem(SEEN) === "1"; } catch (e) {}

    /* A refresh is a deliberate act: if somebody reloads the page they want to
       see it again. Clicking between the pages is not, so that stays instant.
       Back and forward count as navigation, not a reload. */
    var isReload = false;
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      if (nav && nav.type) {
        isReload = nav.type === "reload";
      } else if (performance.navigation) {
        isReload = performance.navigation.type === 1;   /* older browsers */
      }
    } catch (e) {}
    if (isReload) alreadySeen = false;

    var done = false;

    function finish() {
      if (done) return;
      done = true;
      plate.classList.remove("is-drawing");
      plate.classList.add("is-drawn");
      try { sessionStorage.setItem(SEEN, "1"); } catch (e) {}
    }

    /* Hide the real logo behind a full dash offset, the instant the clone
       has been taken. Every path has pathLength 1, so one offset of 1 hides
       all of them and 0 draws all of them, whatever their real lengths. */
    function arm() { plate.classList.add("is-drawing"); }

    function run() {
      /* Web Animations rather than a CSS transition: transitionend does not
         fire in a backgrounded tab and a dropped event would leave the logo
         stuck mid-draw. This gives a real completion promise. */
      if (typeof g.animate === "function") {
        var anim = g.animate(
          [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
          { duration: 1600, easing: "cubic-bezier(.45,.05,.25,1)", fill: "forwards" }
        );
        anim.finished.then(function () { anim.cancel(); finish(); })
                     .catch(finish);
      } else {
        finish();                          /* no WAAPI: just show it */
      }
      setTimeout(finish, 2600);            /* last resort */
    }

    /* The order is the whole trick: clone while this logo is still solid
       (the copy on the newspaper is kept black and white by the stylesheet),
       then hide this one, then draw it back on the coloured board. */
    if (reduce || alreadySeen) {
      plate.classList.add("is-drawn");
      if (window.__fpAlignMast) { window.__fpAlignMast(); }
      return;
    }
    if (window.__fpAlignMast) { window.__fpAlignMast(); }
    arm();
    if (turning) { setTimeout(run, 4550); } else { run(); }
  })();

  /* ---------------------------------------------------- footer wordmark
     Sized to its own viewBox rather than a fixed font-size, so it can never
     run past the edge or get clipped at the baseline. */
  (function () {
    var svg = document.querySelector(".fplate");
    if (!svg) return;
    var t = svg.querySelector(".fplate__t");
    if (!t) return;

    function fit() {
      var VB_W = 1000, VB_H = 170, BASE = 120;
      t.setAttribute("font-size", BASE);
      var b;
      try { b = t.getBBox(); } catch (e) { return; }
      if (!b || !b.width || !b.height) return;
      /* fill the box on whichever axis runs out first, with a little air */
      var scale = Math.min((VB_W * 0.97) / b.width, (VB_H * 0.88) / b.height);
      t.setAttribute("font-size", Math.round(BASE * scale));
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fit).catch(fit);
    } else {
      fit();
    }
    window.addEventListener("resize", fit, { passive: true });
  })();

})();
