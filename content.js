chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FILL_SCHEDULE') {
    const ids = message.payload;
    let successCount = 0;

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        // timepeak triggers on mousedown/mouseup
        const mousedownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        const mouseupEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window
        });

        el.dispatchEvent(mousedownEvent);
        el.dispatchEvent(mouseupEvent);
        successCount++;
      } else {
        console.warn(`Timepick Saver: Element with id ${id} not found.`);
      }
    });
    
    console.log(`Timepick Saver: Successfully dispatched events to ${successCount} cells.`);
    sendResponse({ success: true, count: successCount });
  }
  return true;
});
