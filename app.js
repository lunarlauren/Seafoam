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
      { name: "Alex", initials: "A", color: "linear-gradient(145deg,#88efd9,#7478cf)", image: "./Alex-Character.png", bio: "Taken from Earth and pulled into F.A.T.E. Labs’ experiment, Alex has to decide which of her new allies she can trust." },
      { name: "Yunoire", initials: "Y", color: "linear-gradient(145deg,#8aabff,#b66fe5)", image: "./YunoirePNG.png", bio: "A Kir from the strange world Alex wakes up on. Her growing bond with Alex offers a glimpse of life beyond the experiment." },
      { name: "Jack", initials: "J", color: "linear-gradient(145deg,#c9a5ff,#6359a9)", image: "./Jack Transparent.png", bio: "Part of Alex’s circle aboard the ship. As the crew is pushed into danger, Jack’s loyalties become harder to read." },
      { name: "Charlotte", initials: "C", color: "linear-gradient(145deg,#ff9fcf,#bd577f)", image: "./Charlotte Transparent.png", bio: "A decisive member of the crew whose choices carry real consequences for the people around her." },
      { name: "Apollo", initials: "A", color: "linear-gradient(145deg,#7fe0f1,#4d739e)", image: "./apollo transparent.png", bio: "A charismatic presence with influence over the crew—and intentions that are not always easy to see." },

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
        ? '<img src="' + character.image + '" alt="' + character.name + '">'
        : character.initials;
      return '<span class="portrait" style="--portrait-bg:' + character.color + '">' + picture + '</span>';
    }

    function setPanelButtonState(name) {
      panelButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.panel === name));
      });
    }

    function openPanel(name) {
      modal.hidden = false;
      modal.style.left = ""; modal.style.top = ""; modal.style.bottom = ""; modal.style.transform = "";
      setPanelButtonState(name);
      modalBody.scrollTop = 0;
      renderPanel(name);
      playChime();
    }

    function openPoster() {
      modal.hidden = false;
      modal.style.left = ""; modal.style.top = ""; modal.style.bottom = ""; modal.style.transform = "";
      setPanelButtonState("");
      modalHeading.textContent = "Seafoam · Best Poster";
      modalBody.innerHTML = '<img class="poster-view" src="./best%20poster%20square%20%281%29.png" alt="Seafoam Best Poster award artwork">';
      modalBody.scrollTop = 0;
    }

    function closePanel() {
      modal.hidden = true;
      setPanelButtonState("");
    }

    function renderPanel(name) {
      const headings = {
        episodes: "Episode archive",
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
          '</div>';
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
          '<p class="modal-lede">A hand-drawn sci-fantasy animated web series created by Lauren Leven.</p>' +
          '<p class="about-copy">After being taken from Earth, Alex wakes in a world shaped by the sea and caught inside F.A.T.E. Labs’ experiment. As she searches for a way to understand what happened, she must navigate uncertain alliances, simulated choices, and the people whose lives are tied to her own. Seafoam is an original animated sci-fantasy series about identity, trust, and what it means to choose your own future. If you enjoy hand-drawn webcomics, imaginative animation, and creator-led indie series, explore the episodes and meet the cast.</p>' +
          '<div class="fact-list"><span class="fact">Original animation</span><span class="fact">Sci-fantasy</span><span class="fact">Created by Lauren Leven</span></div>';
      }
    }

    function renderCharacter(index) {
      const character = characters[index];
      modalHeading.textContent = character.name;
      modalBody.innerHTML =
        '<button class="social-link" type="button" id="backToCharacters">← All characters</button>' +
        '<div class="character-detail">' +
        portraitMarkup(character).replace('class="portrait"', 'class="portrait character-portrait"') +
        '<div><h2 class="modal-title">' + character.name + '</h2><p class="about-copy">' + character.bio + '</p></div></div>' +
        ''; 
      modalBody.querySelector("#backToCharacters").addEventListener("click", function () { renderPanel("characters"); });
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

    videoPoster.addEventListener("error", function () {
      if (videoPoster.dataset.fallback) return;
      videoPoster.dataset.fallback = "true";
      videoPoster.src = "https://i.ytimg.com/vi/" + episodes.find(function (item) { return item.number === activeEpisode; }).videoId + "/hqdefault.jpg";
    });

    playVideoButton.addEventListener("click", function () {
      const episode = episodes.find(function (item) { return item.number === activeEpisode; });
      if (!episode || !episode.videoId) return;
      videoStarted = true;
      videoFrame.title = "Seafoam Episode " + Number(episode.number) + " — " + episode.title;
      videoFrame.src = "https://www.youtube-nocookie.com/embed/" + episode.videoId + "?rel=0&autoplay=1";
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
