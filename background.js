chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    chrome.tabs.create({
      url: 'release_notes.html'
    });
  }
});
