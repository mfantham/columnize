async function getSelectedText(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.getSelection()?.toString() ?? ""
  });

  return result?.result ?? "";
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  const selectedText = await getSelectedText(tab.id);
  const textId = crypto.randomUUID();
  await chrome.storage.session.set({ [textId]: selectedText });

  const url = chrome.runtime.getURL(`viewer.html?id=${encodeURIComponent(textId)}`);
  await chrome.tabs.create({ url });
});
