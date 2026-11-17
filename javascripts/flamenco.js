// Sony Music China's official Bilibili upload of the 1959 Kind of Blue
// master. The player stays invisible; the page does not host the audio.
// A full navigation unloads the iframe, so the start time is kept in
// sessionStorage and the next page seeks there.
var FLAMENCO_BASE = "https://player.bilibili.com/player.html?isOutside=true&aid=81449345&bvid=BV14J411h7xr&cid=304116945&p=1&danmaku=0&autoplay=1";
var FLAMENCO_KEY = "flamenco-sketches";
var FLAMENCO_LENGTH = 567;

(function () {
  var host = document.getElementById("flamenco");
  if (!host) {
    host = document.createElement("div");
    host.id = "flamenco";
    host.className = "flamenco-audio";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
  }

  function readState() {
    try {
      var raw = sessionStorage.getItem(FLAMENCO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeState(state) {
    try {
      sessionStorage.setItem(FLAMENCO_KEY, JSON.stringify(state));
    } catch (error) {}
  }

  var state = readState();
  var now = Date.now();
  if (!state || typeof state.startedAt !== "number" || state.startedAt > now) {
    state = { startedAt: now, audible: false };
  }
  writeState(state);

  // Center of the speaker control inside the 640x360 player.
  // The host is clipped to that control, so only it can take a click.
  var iconX = 615;
  var iconY = 323;
  var soundAllowed = false;
  var armed = false;
  var parked = false;
  var pointer = { x: 24, y: 24 };
  var settle = 0;
  var quietUntil = 0;

  function place(x, y) {
    host.style.left = (x - iconX) + "px";
    host.style.top = (y - iconY) + "px";
  }

  place(24, 24);

  function markAudible() {
    state.audible = true;
    writeState(state);
  }

  function park() {
    if (parked) {
      return;
    }
    parked = true;
    markAudible();
    document.removeEventListener("pointermove", onMove, true);
    host.style.pointerEvents = "none";
    host.style.zIndex = "-1";
    // Keep the clipped player inside the viewport so playback is not treated as off-screen.
    place(24, 24);
  }

  function onMove(event) {
    if (parked) {
      return;
    }
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (window.performance.now() < quietUntil) {
      return;
    }
    var rect = host.getBoundingClientRect();
    var dx = event.clientX - (rect.left + iconX);
    var dy = event.clientY - (rect.top + iconY);
    if (dx * dx + dy * dy < 64 && host.style.pointerEvents === "auto") {
      return;
    }
    host.style.pointerEvents = "none";
    window.clearTimeout(settle);
    settle = window.setTimeout(function () {
      if (parked) {
        return;
      }
      place(pointer.x, pointer.y);
      host.style.pointerEvents = "auto";
      quietUntil = window.performance.now() + 400;
    }, 80);
  }

  function arm() {
    if (armed || soundAllowed || parked) {
      return;
    }
    armed = true;
    host.style.zIndex = "2147483646";
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerdown", onDown, true);
  }

  function onDown(event) {
    if (parked || event.target !== iframe) {
      return;
    }
    window.setTimeout(park, 250);
  }

  function sourceNow() {
    var seconds = Math.floor((Date.now() - state.startedAt) / 1000);
    if (seconds < 0) {
      seconds = 0;
    }
    if (seconds > FLAMENCO_LENGTH - 1) {
      seconds = FLAMENCO_LENGTH - 1;
    }
    return FLAMENCO_BASE + "&muted=0" + (seconds > 0 ? "&t=" + seconds : "");
  }

  var iframe = document.createElement("iframe");
  iframe.id = "flamenco-player";
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.allow = "autoplay; encrypted-media";
  window.addEventListener("blur", function () {
    if (!armed || parked || document.activeElement !== iframe) {
      return;
    }
    window.setTimeout(park, 300);
  });

  function mount() {
    iframe.src = sourceNow();
    host.replaceChildren(iframe);
  }

  // A silent one-sample wave, not the recording. It only asks whether sound may start.
  // The player is created after that answer so Bilibili can begin with sound when allowed.
  var probe = document.createElement("audio");
  probe.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
  var attempt = probe.play();
  if (attempt && typeof attempt.then === "function") {
    attempt.then(function () {
      soundAllowed = true;
      markAudible();
      probe.pause();
      mount();
    }).catch(function () {
      mount();
      arm();
    });
  } else {
    mount();
    arm();
  }
})();
