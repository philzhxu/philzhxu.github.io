// Sony Music China's official upload of the 1959 Kind of Blue master
// (9:27). The page embeds Bilibili's player; it does not host the audio.
var FLAMENCO_PAGE = "https://www.bilibili.com/video/BV14J411h7xr";

(function () {
  var root = document.getElementById("flamenco");
  var hint = document.getElementById("flamenco-hint");
  var player = document.getElementById("flamenco-player");
  if (!root || !hint || !player) {
    return;
  }

  function showTapHint() {
    root.setAttribute("data-playback", "blocked");
    hint.hidden = false;
    hint.textContent = "Tap the speaker on the player to hear it";
  }

  function showPlaying() {
    root.setAttribute("data-playback", "playing");
    hint.textContent = "";
    hint.hidden = true;
  }

  // A silent clip only checks whether this browser will allow sound.
  // It is not the recording.
  var probe = document.createElement("audio");
  probe.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
  var attempt = probe.play();
  if (attempt && typeof attempt.then === "function") {
    attempt.then(function () {
      probe.pause();
      showPlaying();
    }).catch(showTapHint);
  } else {
    showTapHint();
  }

  window.setTimeout(function () {
    if (root.getAttribute("data-playback") === "loading") {
      showTapHint();
    }
  }, 4000);

  window.addEventListener("blur", function () {
    if (document.activeElement === player && root.getAttribute("data-playback") === "blocked") {
      showPlaying();
    }
  });

  player.addEventListener("error", function () {
    hint.hidden = false;
    hint.innerHTML = 'The player did not load. <a href="' + FLAMENCO_PAGE + '">Open it on Bilibili</a>.';
  });
})();
