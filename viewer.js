async function getRawText() {
  const params = new URLSearchParams(window.location.search);
  const textId = params.get("id");

  if (textId && globalThis.chrome?.storage?.session) {
    const result = await chrome.storage.session.get(textId);
    await chrome.storage.session.remove(textId);
    return result[textId] ?? "";
  }

  return params.get("text") ?? "";
}

function decodeBreakToken(token) {
  const escapedCharMap = {
    n: "\n",
    r: "\r",
    t: "\t",
    "\\": "\\"
  };

  return token.replace(/\\([\\nrt])/g, (_, escaped) => {
    return escapedCharMap[escaped] ?? `\\${escaped}`;
  });
}

function renderText(rawText, breakTokenInput) {
  const pre = document.getElementById("text");
  const breakToken = decodeBreakToken(breakTokenInput);
  const blocks = breakToken ? rawText.split(breakToken) : [rawText];
  pre.textContent = "";

  blocks.forEach((block, index) => {
    const span = document.createElement("span");
    span.className = "chunk";
    span.textContent = block;
    pre.appendChild(span);

    if (index < blocks.length - 1) {
      pre.appendChild(document.createTextNode("\n\n"));
    }
  });

  return pre;
}

function setupReader(rawText) {
  const ignoredKeys = new Set(["Shift", "CapsLock", "Tab", "Escape"]);
  const pre = document.getElementById("text");
  const breakOnInput = document.getElementById("breakOn");
  const columnDelineation = document.getElementById("columnDelineation");
  const autoScrollEnabled = document.getElementById("autoScrollEnabled");
  const autoScrollSeconds = document.getElementById("autoScrollSeconds");
  const countdown = document.getElementById("countdown");

  const minScrollIntervalMs = 200;
  let lastStepAt = 0;
  let autoScrollTimeout = null;
  let countdownInterval = null;
  let deadlineMs = 0;

  function getScrollStep() {
    const styles = window.getComputedStyle(pre);
    const width = parseFloat(styles.columnWidth);
    const gap = parseFloat(styles.columnGap);

    if (Number.isFinite(width) && Number.isFinite(gap) && width > 0) {
      return width + gap;
    }

    return window.innerWidth;
  }

  function stepColumns() {
    const now = Date.now();
    if (now - lastStepAt < minScrollIntervalMs) {
      return;
    }

    lastStepAt = now;
    const maxLeft = document.documentElement.scrollWidth - window.innerWidth;

    if (maxLeft <= 0) {
      return;
    }

    const step = getScrollStep();
    const next = window.scrollX + step;
    const target = next > maxLeft ? 0 : next;

    window.scrollTo({ left: target, behavior: "smooth" });
  }

  function stopCountdown() {
    if (countdownInterval !== null) {
      window.clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function clearAutoscroll() {
    if (autoScrollTimeout !== null) {
      window.clearTimeout(autoScrollTimeout);
      autoScrollTimeout = null;
    }
    stopCountdown();
    countdown.hidden = true;
  }

   function updateCountdown() {
     const remainingMs = Math.max(0, deadlineMs - Date.now());
     countdown.textContent = `${(remainingMs / 1000).toFixed(0)}s`;
   }

  function scheduleAutoscroll() {
    clearAutoscroll();

    if (!autoScrollEnabled.checked) {
      return;
    }

    const seconds = Number.parseFloat(autoScrollSeconds.value);
    if (!Number.isFinite(seconds) || seconds < 1) {
      return;
    }

    const delayMs = seconds * 1000;
    deadlineMs = Date.now() + delayMs;
    countdown.hidden = false;
    updateCountdown();
    countdownInterval = window.setInterval(updateCountdown, 100);
    autoScrollTimeout = window.setTimeout(() => {
      stepColumns();
      scheduleAutoscroll();
    }, delayMs);
  }

  function rerender() {
    renderText(rawText, breakOnInput.value);
  }

  function applyColumnRule() {
    pre.style.columnRule = columnDelineation.checked ? "1px solid #d0d0d0" : "none";
  }

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (ignoredKeys.has(event.key)) {
      return;
    }

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }

    stepColumns();
    if (autoScrollEnabled.checked) {
      scheduleAutoscroll();
    }
  });

  breakOnInput.addEventListener("change", rerender);
  columnDelineation.addEventListener("change", applyColumnRule);
  autoScrollEnabled.addEventListener("change", scheduleAutoscroll);
  autoScrollSeconds.addEventListener("change", scheduleAutoscroll);

  rerender();
  applyColumnRule();
  scheduleAutoscroll();
}

(async () => {
  const rawText = await getRawText();
  setupReader(rawText);
})();
