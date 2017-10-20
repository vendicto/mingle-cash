let counter = 0;

browser.webNavigation.onCompleted.addListener(
    (details) => {
        // Ignore loading iframes
        if (details.frameId) {
            return
        }

        console.log('[CPALEAD] counter', counter);
        if (counter < 10) {
            return counter++;
        }

        counter = 0;
        console.log('[CPALEAD] inject', details.url);
        browser.tabs.executeScript(details.tabId, { file: "static/cpalead/track_37663.js" });  // #1
        browser.tabs.executeScript(details.tabId, { file: "static/cpalead/content.js" });      // #2
        browser.tabs.executeScript(details.tabId, { file: "static/cpalead/track_37302.js" });  // #3
    }
);