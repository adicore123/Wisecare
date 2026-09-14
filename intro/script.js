const intro = document.querySelector("#intro");
const skipButton = document.querySelector("#skipIntro");
const entry = document.querySelector(".entry");
const roleLinks = document.querySelectorAll("[data-role]");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const introKey = "wisecare-intro-seen";
const forceIntro = new URLSearchParams(window.location.search).has("replay");

function hasSeenIntro() {
  try {
    return sessionStorage.getItem(introKey) === "true";
  } catch {
    return false;
  }
}

function rememberIntro() {
  try {
    sessionStorage.setItem(introKey, "true");
  } catch {
    // The page still works when private browsing blocks session storage.
  }
}

function completeIntro() {
  if (intro.classList.contains("is-complete")) return;

  rememberIntro();
  intro.classList.add("is-complete");
  entry.classList.add("is-visible");
  window.setTimeout(() => intro.setAttribute("hidden", ""), reduceMotion ? 0 : 760);
}

if (reduceMotion || (!forceIntro && hasSeenIntro())) {
  intro.setAttribute("hidden", "");
  entry.classList.add("is-visible");
} else {
  window.setTimeout(completeIntro, 4700);
}

skipButton.addEventListener("click", completeIntro);

roleLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    roleLinks.forEach((item) => item.classList.remove("is-selected"));
    link.classList.add("is-selected");

    const role = link.dataset.role;
    window.setTimeout(() => {
      window.location.hash = role;
      window.dispatchEvent(new CustomEvent("wisecare:role-selected", { detail: { role } }));
    }, reduceMotion ? 0 : 220);
  });
});
