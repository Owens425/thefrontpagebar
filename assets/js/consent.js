/* Consent-gated analytics. Nothing loads, and no cookie is set, until Accept.
   UK PECR: analytics cookies need consent first. Decline sets nothing at all
   beyond a note that the question was answered. */
(function () {
  "use strict";
  var GA = document.currentScript && document.currentScript.getAttribute("data-ga");
  if (!GA) return;

  var KEY = "fp-consent";
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }

  function load() {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA, { anonymize_ip: true });
  }

  if (saved === "yes") { load(); return; }
  if (saved === "no") return;

  var bar = document.createElement("div");
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Cookies");
  bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:80;background:#141110;" +
    "border-top:1px solid #433A34;color:#F4F1EC;padding:1rem clamp(1rem,4vw,2rem);" +
    "display:flex;flex-wrap:wrap;gap:.7rem 1.2rem;align-items:center;justify-content:center;" +
    "font-family:'Source Sans 3',system-ui,Arial,sans-serif;font-size:.95rem;line-height:1.5";

  var p = document.createElement("p");
  p.style.cssText = "margin:0;max-width:44ch";
  p.textContent = "We would like to count visits with Google Analytics. Nothing is set unless you say yes.";

  function mkBtn(label, primary) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText = "font-family:Oswald,Arial,sans-serif;letter-spacing:.14em;" +
      "text-transform:uppercase;font-size:.82rem;padding:.6rem 1.2rem;min-height:44px;" +
      "cursor:pointer;border:1px solid " + (primary ? "#F26A21" : "#433A34") + ";" +
      "background:" + (primary ? "#F26A21" : "transparent") + ";" +
      "color:" + (primary ? "#0C0A09" : "#F4F1EC") + ";";
    return b;
  }

  var yes = mkBtn("Accept", true);
  var no = mkBtn("Decline", false);

  function answer(val) {
    try { localStorage.setItem(KEY, val); } catch (e) {}
    bar.remove();
    if (val === "yes") load();
  }
  yes.addEventListener("click", function () { answer("yes"); });
  no.addEventListener("click", function () { answer("no"); });

  bar.appendChild(p);
  bar.appendChild(yes);
  bar.appendChild(no);
  document.body.appendChild(bar);
})();
