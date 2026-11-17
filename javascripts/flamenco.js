// Official Kind of Blue master on Spotify (1959 Columbia/Sony release).
// The Columbia and MilesDavisVEVO YouTube uploads of this track do not
// allow embedded playback (YouTube error 150), so the homepage uses
// Spotify's official embed instead of a downloaded or rehosted file.
var FLAMENCO_TRACK_URL = "https://open.spotify.com/track/46QZ7evVstgFq6jJpSo20G?utm_source=generator&theme=0";
var FLAMENCO_OPEN_URL = "https://open.spotify.com/track/46QZ7evVstgFq6jJpSo20G";

(function () {
  var root = document.getElementById("flamenco");
  var toggle = document.getElementById("flamenco-toggle");
  var hint = document.getElementById("flamenco-hint");
  var controller = null;
  var ready = false;
  var playing = false;
  var heardPlayback = false;
  var autoplaySettled = false;

  if (!root || !toggle || !hint || !document.getElementById("flamenco-mount")) {
    return;
  }

  function setPlayback(mode) {
    var playingNow = mode === "playing";
    root.setAttribute("data-playback", mode);
    toggle.hidden = !(playingNow || mode === "paused" || (mode === "blocked" && !ready));
    toggle.disabled = false;
    toggle.textContent = playingNow ? "Pause" : "Play";
    toggle.setAttribute("aria-label", playingNow ? "Pause Flamenco Sketches" : "Play Flamenco Sketches");
    toggle.setAttribute("aria-pressed", playingNow ? "true" : "false");
    if (mode === "blocked") {
      hint.hidden = false;
      hint.textContent = ready ? "Tap the play button to start" : "Tap play to open the official recording.";
    } else {
      hint.textContent = "";
      hint.hidden = true;
    }
  }

  function markPlaying() {
    heardPlayback = true;
    playing = true;
    autoplaySettled = true;
    setPlayback("playing");
  }

  function markSilent() {
    playing = false;
    if (!autoplaySettled && !heardPlayback) {
      return;
    }
    setPlayback(heardPlayback ? "paused" : "blocked");
  }

  toggle.addEventListener("click", function () {
    if (!ready || !controller) {
      window.open(FLAMENCO_OPEN_URL, "_blank", "noopener");
      return;
    }
    if (playing) {
      controller.pause();
      return;
    }
    if (typeof controller.resume === "function") {
      controller.resume();
    } else {
      controller.play();
    }
  });

  window.onSpotifyIframeApiReady = function (IFrameAPI) {
    IFrameAPI.createController(
      document.getElementById("flamenco-mount"),
      {
        width: "100%",
        height: 152,
        url: FLAMENCO_TRACK_URL
      },
      function (embedController) {
        controller = embedController;

        embedController.addListener("ready", function () {
          ready = true;
          var iframe = root.querySelector("iframe");
          if (iframe) {
            iframe.title = "Flamenco Sketches by Miles Davis, Kind of Blue, on Spotify";
          }
          embedController.play();
          window.setTimeout(function () {
            autoplaySettled = true;
            if (!playing) {
              setPlayback("blocked");
            }
          }, 2500);
        });

        embedController.addListener("playback_update", function (event) {
          var data = (event && event.data) || {};
          if (data.isPaused === false) {
            markPlaying();
            return;
          }
          if (data.isPaused === true) {
            markSilent();
          }
        });
      }
    );
  };

  var api = document.createElement("script");
  api.src = "https://open.spotify.com/embed/iframe-api/v1";
  api.async = true;
  document.head.appendChild(api);

  window.setTimeout(function () {
    if (!ready) {
      autoplaySettled = true;
      setPlayback("blocked");
      hint.hidden = false;
      hint.textContent = "Tap play to open the official recording.";
    }
  }, 12000);
})();
