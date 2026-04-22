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

function renderText(rawText) {
  const pre = document.getElementById("text");
  const blocks = rawText.split(/\r?\n\r?\n+/);

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

function setupKeyboardScroll(pre) {
  const minScrollIntervalMs = 200;
  let lastStepAt = 0;

  function getScrollStep() {
    const styles = window.getComputedStyle(pre);
    const width = parseFloat(styles.columnWidth);
    const gap = parseFloat(styles.columnGap);

    if (Number.isFinite(width) && Number.isFinite(gap) && width > 0) {
      return width + gap;
    }

    return window.innerWidth;
  }

  window.addEventListener("keydown", () => {
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
  });
}

(async () => {
  const rawText = await getRawText();
  const pre = renderText(rawText);
  setupKeyboardScroll(pre);
})();
