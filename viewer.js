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

let currentRawText = "";



function renderText(rawText, breakTokenInput) {
  const pre = document.getElementById("text");
  let blocks = [rawText];
  if (breakTokenInput) {
    try {
      const regex = new RegExp(breakTokenInput);
      blocks = rawText.split(regex);
    } catch (e) {
      // If regex is invalid, fall back to no splitting
      console.warn("Invalid break regex:", breakTokenInput, e);
    }
  }
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
  const fontFamily = document.getElementById("fontFamily");
  const fontSize = document.getElementById("fontSize");
  const lineHeight = document.getElementById("lineHeight");
  const autoScrollEnabled = document.getElementById("autoScrollEnabled");
  const autoScrollSeconds = document.getElementById("autoScrollSeconds");
  const countdown = document.getElementById("countdown");
  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");
  let originalRawText = currentRawText;
  let isEditing = false;

  const minScrollIntervalMs = 200;
  let lastStepAt = 0;
  let autoScrollTimeout = null;
  let countdownInterval = null;
  let deadlineMs = 0;

  function getScrollStep() {
    const styles = window.getComputedStyle(pre);
    const width = parseFloat(styles.columnWidth);

    if (Number.isFinite(width) && width > 0) {
      return width;
    }

    return window.innerWidth;
  }

  function stepColumns() {
    const now = Date.now();
    if (now - lastStepAt < minScrollIntervalMs) {
      return;
    }

    lastStepAt = now;

    const documentWidth = document.documentElement.scrollWidth;
    const maxLeft = documentWidth - window.innerWidth;

    if (maxLeft <= 0) {
      return;
    }

    if (window.scrollX >= maxLeft) {
      window.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    const step = getScrollStep();
    const nColumns = documentWidth / step;

    const currentColumn = Math.floor(window.scrollX / step);
    const nextColumn = (currentColumn + 1) % nColumns;

    const next = Math.ceil(nextColumn * step);
    const target = next > maxLeft ? maxLeft : next;

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
    renderText(currentRawText, breakOnInput.value);
    setColumnWidth();
  }

  function applyColumnRule() {
    pre.style.columnRule = columnDelineation.checked ? "1px solid #d0d0d0" : "none";
  }

  function setColumnWidth() {
    const text = pre.textContent;
    const lines = text.split("\n");
    const maxLength = Math.max(...lines.map((l) => l.length), 1);
    pre.style.columnWidth = maxLength + "ch";
  }

window.addEventListener("keydown", (event) => {
      const target = event.target;
      
      if (isEditing) {
        if (event.key === "Escape") {
          pre.textContent = originalRawText;
          toggleEditMode();
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === "s") {
          event.preventDefault();
          saveEdits();
          return;
        }
        return;
      }

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

   // Make vertical scroll wheel control horizontal scrolling
   window.addEventListener("wheel", (event) => {     
     // Scroll horizontally based on vertical wheel movement
     window.scrollBy({
       left: event.deltaY,
       behavior: "instant"
     });
   });

  breakOnInput.addEventListener("change", rerender);
  columnDelineation.addEventListener("change", applyColumnRule);
  fontFamily.addEventListener("change", () => {
    pre.style.fontFamily = fontFamily.value;
  });
  fontSize.addEventListener("change", () => {
    pre.style.fontSize = fontSize.value + "rem";
    pre.style.lineHeight = lineHeight.value;
  });
  lineHeight.addEventListener("change", () => {
    pre.style.lineHeight = lineHeight.value;
  });
  autoScrollEnabled.addEventListener("change", scheduleAutoscroll);
  autoScrollSeconds.addEventListener("change", scheduleAutoscroll);

  function toggleEditMode() {
    isEditing = !isEditing;
    editBtn.hidden = isEditing;
    saveBtn.hidden = !isEditing;
    pre.contentEditable = isEditing;
    pre.style.outline = isEditing ? "2px solid #007bff" : "none";
    pre.style.cursor = isEditing ? "text" : "default";
    pre.style.whiteSpace = isEditing ? "pre-wrap" : "pre";

    if (isEditing) {
      pre.focus();
    } else {
      originalRawText = pre.textContent;
    }
  }

  function saveEdits() {
    currentRawText = pre.textContent;
    toggleEditMode();
    setColumnWidth();
  }

  editBtn.addEventListener("click", toggleEditMode);
  saveBtn.addEventListener("click", saveEdits);

  rerender();
  applyColumnRule();
  setColumnWidth();
  scheduleAutoscroll();
}

(async () => {
  currentRawText = await getRawText();
  setupReader(currentRawText);
})();
