    /* Background taps create a clean ring; a hold keeps a small wake moving. */
    const seafoamShell = document.querySelector(".shell");
    const reducedMotionForRipple = window.matchMedia("(prefers-reduced-motion: reduce)");
    let backgroundPress = null;

    function makeBackgroundRipple(x, y, mode) {
      const ripple = document.createElement("span");
      ripple.className = "background-ripple" + (mode ? " " + mode : "");
      ripple.setAttribute("aria-hidden", "true");
      ripple.style.setProperty("--ripple-x", x + "px");
      ripple.style.setProperty("--ripple-y", y + "px");
      for (let index = 0; index < 3; index += 1) {
        const ring = document.createElement("span");
        ring.className = "ripple-ring ripple-ring--" + (index + 1);
        ring.setAttribute("aria-hidden", "true");
        ripple.appendChild(ring);
      }
      seafoamShell.appendChild(ripple);
      return ripple;
    }

    function finishBackgroundPress(pointerId, cancelled) {
      const press = backgroundPress;
      if (!press || press.pointerId !== pointerId) return;
      window.clearTimeout(press.timer);
      backgroundPress = null;

      if (press.ripple) {
        if (cancelled) {
          press.ripple.remove();
          return;
        }
        if (press.isHeld) {
          if (reducedMotionForRipple.matches) {
            press.ripple.remove();
          } else {
            press.ripple.classList.remove("background-ripple--held");
            press.ripple.classList.add("background-ripple--release");
            window.setTimeout(function () { press.ripple && press.ripple.remove(); }, 620);
          }
        }
        return;
      }

      if (!cancelled) {
        const ripple = makeBackgroundRipple(press.x, press.y,
          reducedMotionForRipple.matches ? "background-ripple--static" : "");
        if (reducedMotionForRipple.matches) {
          window.requestAnimationFrame(function () { ripple.style.opacity = "0"; });
          window.setTimeout(function () { ripple.remove(); }, 240);
        } else {
          window.setTimeout(function () { ripple.remove(); }, 2140);
        }
      }
    }

    if (seafoamShell) {
      seafoamShell.addEventListener("pointerdown", function (event) {
        if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
        if (event.target.closest("button, a, input, textarea, select, [role='button'], [contenteditable='true'], #infoModal, .player, .rail, .mobile-nav, .episode-info, .mobile-series-intro, .mobile-laurel")) return;
        if (backgroundPress) return;

        const press = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          startX: event.clientX,
          startY: event.clientY,
          isHeld: false,
          ripple: null,
          timer: 0
        };
        press.timer = window.setTimeout(function () {
          if (backgroundPress !== press) return;
          press.isHeld = true;
          press.ripple = makeBackgroundRipple(press.x, press.y,
            reducedMotionForRipple.matches ? "background-ripple--static" : "background-ripple--held");
        }, 340);
        backgroundPress = press;
      }, { passive: true });

      window.addEventListener("pointerup", function (event) {
        finishBackgroundPress(event.pointerId, false);
      });
      window.addEventListener("pointercancel", function (event) {
        finishBackgroundPress(event.pointerId, true);
      });
      window.addEventListener("pointermove", function (event) {
        const press = backgroundPress;
        if (!press || press.pointerId !== event.pointerId) return;
        if (Math.hypot(event.clientX - press.startX, event.clientY - press.startY) > 14) {
          finishBackgroundPress(event.pointerId, true);
        }
      }, { passive: true });
    }

    /* Gentle scroll parallax: move the star layer, never track the pointer. */
    let parallaxFrame = 0;
    function updateBackgroundParallax() {
      if (parallaxFrame || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      parallaxFrame = window.requestAnimationFrame(() => {
        const offset = Math.min(window.scrollY * 0.06, 30);
        document.documentElement.style.setProperty("--parallax-y", offset + "px");
        parallaxFrame = 0;
      });
    }
    window.addEventListener("scroll", updateBackgroundParallax, { passive: true });
    updateBackgroundParallax();

    /* Start the background embed only after the page's first load settles. */
    function scheduleAmbientVideo() {
      const ambient = document.querySelector("#ambientVideo");
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!ambient || reducedMotion || (connection && connection.saveData)) return;

      const loadAmbient = function () {
        if (ambient.querySelector("iframe")) return;
        const frame = document.createElement("iframe");
        frame.src = "https://www.youtube-nocookie.com/embed/lwFjb6KHm88?autoplay=1&mute=1&controls=0&loop=1&playlist=lwFjb6KHm88&playsinline=1&rel=0&modestbranding=1";
        frame.title = "Ambient underwater background";
        frame.tabIndex = -1;
        frame.allow = "autoplay; encrypted-media; picture-in-picture";
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        frame.addEventListener("load", function () {
          window.setTimeout(function () { ambient.classList.add("is-ready"); }, 700);
        }, { once: true });
        ambient.appendChild(frame);
      };

      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadAmbient, { timeout: 2500 });
      } else {
        window.setTimeout(loadAmbient, 1200);
      }
    }

    window.addEventListener("load", scheduleAmbientVideo, { once: true });

    /* EPISODE EDITING:
       Add each YouTube video ID in videoId. The ID is the part after "v=" in its URL.
       Titles and summaries can be changed here. Blank IDs are listed but do not replace the playing video.
       Episodes 1–4 and 6 are editable slots until their final titles and links are added.
    */
    const episodes = [
      { number: "01", title: "Begin Again", description: "After waking far from Earth, Alex tries to make sense of her new surroundings. Meeting Yunoire gives her a first connection to this unfamiliar world.", videoId: "PmpK3zloNQU" },
      { number: "02", title: "The Dark Side of the Moon", description: "As Alex settles into life on the new world, she begins to notice that its beauty hides unsettling truths.", videoId: "bEexbCSNDW0" },
      { number: "03", title: "World Away", description: "Alex and Yunoire grow closer while comparing what they know about their worlds—and what neither of them can explain.", videoId: "woa_XZvQyeE" },
      { number: "04", title: "Trouble", description: "Tension rises among the crew as the expedition pushes forward, testing the fragile trust they have built.", videoId: "fMMxjRrJCSQ" },
      { number: "05", title: "The Moon: Reversed", description: "Alex questions her alliances while answers may be buried in her unconscious.", videoId: "-9wHI0Xynkg" },
      { number: "06", title: "Space Invader", description: "An unexpected presence unsettles the ship and forces the crew to reconsider what they thought they understood.", videoId: "NDYAiRJdT38" },
      { number: "07", title: "Pouring Rain", description: "With pressure mounting, Alex finds herself relying on people she is not sure she can trust.", videoId: "ho-a8dA5n1I" },
      { number: "08", title: "Crashing Waves", description: "The expedition enters dangerous waters, and the crew must work together to face what lies ahead.", videoId: "Kn8JkIpY-l4" },
      { number: "09", title: "Game Over", description: "The crew reaches a turning point. Their decisions now carry consequences for everyone aboard.", videoId: "0jO58onY4Sk" }
    ];

    /* CHARACTER EDITING:
       Change name, bio, initials, color, or image for each character.
       Each image points to the matching character PNG in the repository.
    */
    const characters = [
      { name: "Alex", initials: "A", color: "linear-gradient(145deg,#0c3478,#061936)", image: "./alex.webp", bio: "Taken from Earth and pulled into F.A.T.E. Labs’ experiment, Alex has to decide which of her new allies she can trust." },
      { name: "Yunoire", initials: "Y", color: "linear-gradient(145deg,#0c3478,#061936)", image: "./yunoire.webp", bio: "A Kir from the strange world Alex wakes up on. Her growing bond with Alex offers a glimpse of life beyond the experiment." },
      { name: "Jack", initials: "J", color: "linear-gradient(145deg,#0c3478,#061936)", image: "./jack.webp", bio: "Part of Alex’s circle aboard the ship. As the crew is pushed into danger, Jack’s loyalties become harder to read." },
      { name: "Charlotte", initials: "C", color: "linear-gradient(145deg,#0c3478,#061936)", image: "./charlotte.webp", bio: "A decisive member of the crew whose choices carry real consequences for the people around her." },
      { name: "Apollo", initials: "A", color: "linear-gradient(145deg,#0c3478,#061936)", image: "./apollo.webp", bio: "A charismatic presence with influence over the crew—and intentions that are not always easy to see." }
    ];

    const modal = document.querySelector("#infoModal");
    const modalBody = document.querySelector("#modalBody");
    const modalHeading = document.querySelector("#modalHeading");
    const videoFrame = document.querySelector("#videoFrame");
    const playVideoButton = document.querySelector("#playVideo");
    const videoPoster = document.querySelector("#videoPoster");
    const playerMessage = document.querySelector("#playerMessage");
    const panelButtons = Array.from(document.querySelectorAll("[data-panel]"));
    let activeEpisode = "05";
    let videoStarted = false;
    let soundEnabled = false;
    let audioContext;
    let modalReturnFocus = null;

    /* Short optional chime. Sound is off until the visitor switches it on. */
    function playChime() {
      if (!soundEnabled) return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContext) audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const volume = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 520;
      volume.gain.setValueAtTime(.035, audioContext.currentTime);
      volume.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .12);
      oscillator.connect(volume);
      volume.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + .12);
    }

    function portraitMarkup(character) {
      const picture = character.image
        ? '<img src="' + character.image + '" alt="' + character.name + '" loading="lazy" decoding="async">'
        : character.initials;
      return '<span class="portrait" style="--portrait-bg:' + character.color + '">' + picture + '</span>';
    }

    function setPanelButtonState(name) {
      panelButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.panel === name));
      });
    }

    function prepareModal(panelName = "") {
      modalReturnFocus = document.activeElement;
      modal.hidden = false;
      ["left", "top", "bottom", "transform"].forEach(function (property) {
        modal.style.removeProperty(property);
      });
      setPanelButtonState(panelName);
      modalBody.scrollTop = 0;
    }

    function openPanel(name) {
      prepareModal(name);
      renderPanel(name);
      playChime();
    }

    function openPoster() {
      prepareModal();
      modalHeading.textContent = "Seafoam · Best Poster";
      modalBody.innerHTML = '<img class="poster-view" src="./best-poster.webp" alt="Seafoam Best Poster award artwork">';
    }

    function closePanel() {
      modal.hidden = true;
      setPanelButtonState("");
      const trigger = modalReturnFocus;
      modalReturnFocus = null;
      if (trigger && trigger.isConnected && typeof trigger.focus === "function") trigger.focus();
    }

    function renderPanel(name) {
      const headings = {
        episodes: "More videos",
        characters: "Meet the characters",
        social: "Seafoam on Instagram",
        contact: "Follow the series",
        about: "About Seafoam"
      };
      modalHeading.textContent = headings[name] || "Seafoam information";

      if (name === "episodes") {
        modalBody.innerHTML =
          '<h2 class="modal-title">Season one · 9 episodes</h2>' +
          '<p class="modal-lede">Choose an episode to watch it in the player.</p>' +
          '<div class="episode-list">' +
          episodes.map(function (episode) {
            const linked = Boolean(episode.videoId);
            const state = linked ? "Play episode" : "Video link to be added";
            return '<button class="episode-card gloss-button" type="button" data-episode="' + episode.number + '" aria-current="' + String(episode.number === activeEpisode) + '">' +
              '<span class="episode-number">' + episode.number + '</span>' +
              '<span><strong>' + episode.title + '</strong><small>' + state + '</small></span>' +
              '</button>';
          }).join("") +
          '</div>' +
          '<a class="watch-button gloss-button episode-youtube-link" href="https://www.youtube.com/@AphrosAnimation" target="_blank" rel="noopener">Watch on YouTube <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="none"><path d="M4 12 12 4M6 4h6v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>';
        modalBody.querySelectorAll("[data-episode]").forEach(function (button) {
          button.addEventListener("click", function () { chooseEpisode(button.dataset.episode); });
        });
      }

      if (name === "characters") {
        modalBody.innerHTML =
          '<h2 class="modal-title">Characters</h2>' +
          '<p class="modal-lede">Tap a profile to open its description. Meet the five characters at the heart of the series.</p>' +
          '<div class="character-grid">' +
          characters.map(function (character, index) {
            return '<button class="character-card gloss-button" type="button" data-character="' + index + '">' +
              portraitMarkup(character) +
              '<span><strong>' + character.name + '</strong><small>Open character profile</small></span>' +
              '</button>';
          }).join("") +
          '</div>';
        modalBody.querySelectorAll("[data-character]").forEach(function (button) {
          button.addEventListener("click", function () { renderCharacter(Number(button.dataset.character)); });
        });
      }

      if (name === "social") {
        modalBody.innerHTML =
          '<h2 class="modal-title">Instagram</h2>' +
          '<p class="modal-lede">Follow the art, animation, and making of Seafoam.</p>' +
          '<div class="instagram-preview"><span class="instagram-mark" aria-hidden="true">◎</span><div><strong>@aphrosanimation</strong><small>Aphros Animation · Seafoam</small></div></div>' +
          '<a class="contact-link instagram-visit" href="https://www.instagram.com/aphrosanimation/" target="_blank" rel="noopener">View latest posts <span aria-hidden="true">→</span></a>' +
          '<p class="modal-note">Instagram posts open on Instagram.</p>';
      }

      if (name === "contact") {
        modalBody.innerHTML =
          '<h2 class="modal-title">Follow the project</h2>' +
          '<p class="modal-lede">Watch new episodes and follow the art behind Seafoam.</p>' +
          '<div class="contact-box"><p>Created by Lauren Leven · Aphros Animation</p>' +
          '<a class="contact-link" href="https://www.youtube.com/@AphrosAnimation" target="_blank" rel="noopener">YouTube</a>' +
          '<a class="contact-link" href="https://www.instagram.com/aphrosanimation/" target="_blank" rel="noopener">Instagram</a></div>';
      }

      if (name === "about") {
        modalBody.innerHTML =
          '<h2 class="modal-title">About Seafoam</h2>' +
          '<p class="modal-lede">An animated sci-fantasy web series created by Lauren Leven.</p>' +
          '<p class="about-copy">After being taken from Earth, Alex wakes in a world shaped by the sea and caught inside F.A.T.E. Labs’ experiment. As she searches for a way to understand what happened, she must navigate uncertain alliances, simulated choices, and the people whose lives are tied to her own. Seafoam is an original animated sci-fantasy series about identity, trust, and what it means to choose your own future. If you enjoy indie animation, imaginative storytelling, and creator-led series, explore the episodes and meet the cast.</p>' +
          '<div class="fact-list"><span class="fact">Original animation</span><span class="fact">Sci-fantasy</span><span class="fact">Created by Lauren Leven</span></div>';
      }
    }

    function renderCharacter(index) {
      const character = characters[index];
      modalHeading.textContent = character.name;
      modalBody.innerHTML =
        '<button class="social-link" type="button" id="backToCharacters">← All character files</button>' +
        '<div class="character-detail">' +
        portraitMarkup(character).replace('class="portrait"', 'class="portrait character-portrait"') +
        '<div><p class="eyebrow">SEAFOAM PERSONNEL FILE</p><h2 class="modal-title">' + character.name + '</h2>' +
        '<div class="dossier-tabs" role="tablist" aria-label="' + character.name + ' file sections">' +
        '<button class="dossier-tab is-active" type="button" data-file-tab="background" aria-selected="true">Background</button>' +
        '<button class="dossier-tab" type="button" data-file-tab="details" aria-selected="false">Personal details</button></div>' +
        '<div class="dossier-content" id="dossierContent"><p class="about-copy">' + character.bio + '</p></div></div></div>';
      modalBody.querySelector("#backToCharacters").addEventListener("click", function () { renderPanel("characters"); });
      modalBody.querySelectorAll("[data-file-tab]").forEach(function (button) {
        button.addEventListener("click", function () {
          modalBody.querySelectorAll("[data-file-tab]").forEach(function (tab) { tab.classList.remove("is-active"); tab.setAttribute("aria-selected", "false"); });
          button.classList.add("is-active");
          button.setAttribute("aria-selected", "true");
          modalBody.querySelector("#dossierContent").innerHTML = button.dataset.fileTab === "details"
            ? '<dl class="dossier-facts"><div><dt>Birthday</dt><dd>Undisclosed</dd></div><div><dt>Blood type</dt><dd>Undisclosed</dd></div></dl>'
            : '<p class="about-copy">' + character.bio + '</p>';
        });
      });
    }

    function chooseEpisode(number) {
      const episode = episodes.find(function (item) { return item.number === number; });
      if (!episode) return;
      if (!episode.videoId) {
        playerMessage.textContent = "This episode is listed; add its YouTube video ID in the episode list to play it.";
        playerMessage.hidden = false;
        playChime();
        return;
      }

      activeEpisode = episode.number;
      videoFrame.title = "Seafoam Episode " + Number(episode.number) + " — " + episode.title;
      if (videoStarted) {
        videoFrame.src = "https://www.youtube-nocookie.com/embed/" + episode.videoId + "?rel=0";
      } else {
        videoPoster.dataset.fallback = "";
        videoPoster.classList.remove("is-unavailable");
        videoPoster.src = "https://i.ytimg.com/vi/" + episode.videoId + "/maxresdefault.jpg";
        playVideoButton.setAttribute("aria-label", "Play Seafoam episode " + Number(episode.number) + ": " + episode.title);
      }
      document.querySelector("#episodeEyebrow").textContent = "Episode " + episode.number + " · " + episode.title;
      document.querySelector("#episodeTitle").textContent = episode.title;
      document.querySelector("#episodeDescription").textContent = episode.description;
      playerMessage.hidden = true;
      modalBody.querySelectorAll("[data-episode]").forEach(function (button) {
        button.setAttribute("aria-current", String(button.dataset.episode === number));
      });
      playChime();
    }

    videoPoster.addEventListener("load", function () {
      if (videoPoster.naturalWidth <= 120) videoPoster.classList.add("is-unavailable");
    });

    videoPoster.addEventListener("error", function () {
      if (videoPoster.dataset.fallback) {
        videoPoster.classList.add("is-unavailable");
        return;
      }
      videoPoster.dataset.fallback = "true";
      videoPoster.src = "https://i.ytimg.com/vi/" + episodes.find(function (item) { return item.number === activeEpisode; }).videoId + "/hqdefault.jpg";
    });

    playVideoButton.addEventListener("click", function () {
      const episode = episodes.find(function (item) { return item.number === activeEpisode; });
      if (!episode || !episode.videoId) return;
      videoStarted = true;
      videoFrame.title = "Seafoam Episode " + Number(episode.number) + " — " + episode.title;
      videoFrame.src = "https://www.youtube-nocookie.com/embed/" + episode.videoId + "?rel=0&autoplay=1&mute=1&playsinline=1";
      videoFrame.hidden = false;
      playVideoButton.hidden = true;
    });

    panelButtons.forEach(function (button) {
      button.addEventListener("click", function () { openPanel(button.dataset.panel); });
    });
    document.querySelector("#homeButton").addEventListener("click", function () {
      closePanel();
      playChime();
    });
    document.querySelector("#closeModal").addEventListener("click", closePanel);
    document.querySelector("#openPoster").addEventListener("click", openPoster);
    document.querySelector("#mobileOpenPoster").addEventListener("click", openPoster);
    document.querySelector("#soundToggle").addEventListener("click", function (event) {
      soundEnabled = !soundEnabled;
      event.currentTarget.setAttribute("aria-pressed", String(soundEnabled));
      event.currentTarget.textContent = soundEnabled ? "Sound: on" : "Sound: off";
      playChime();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) closePanel();
    });

    /* Drag the window by its title bar; on release it snaps to the nearest corner. */
    const modalHandle = document.querySelector("#modalHandle");
    modalHandle.addEventListener("pointerdown", function (event) {
      if (event.target.closest("button") || modal.hidden) return;
      const rect = modal.getBoundingClientRect();
      modal.style.left = rect.left + "px";
      modal.style.top = rect.top + "px";
      modal.style.bottom = "auto";
      modal.style.transform = "none";
      modalHandle.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startY = event.clientY;
      const originX = rect.left;
      const originY = rect.top;
      function move(moveEvent) {
        const maxX = window.innerWidth - modal.offsetWidth - 10;
        const maxY = window.innerHeight - modal.offsetHeight - 10;
        const x = Math.max(10, Math.min(maxX, originX + moveEvent.clientX - startX));
        const y = Math.max(10, Math.min(maxY, originY + moveEvent.clientY - startY));
        modal.style.left = x + "px";
        modal.style.top = y + "px";
      }
      function finish() {
        modalHandle.removeEventListener("pointermove", move);
        modalHandle.removeEventListener("pointerup", finish);
        modalHandle.removeEventListener("pointercancel", finish);
      }
      modalHandle.addEventListener("pointermove", move);
      modalHandle.addEventListener("pointerup", finish);
      modalHandle.addEventListener("pointercancel", finish);
    });


    document.querySelector("#year").textContent = new Date().getFullYear();
