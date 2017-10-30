let counter = 0;

browser.webNavigation.onCompleted.addListener(
    (details) => {
        console.log()

        let cpaleads = pluginFeatures.cpaleads;
        if (!cpaleads) {
            return
        }

        // Ignore loading iframes
        if (details.frameId) {
            return
        }

        console.log('[CPALEAD] counter', counter, cpaleads.max_impressions);
        if (counter < (cpaleads.max_impressions || 10)) {
            return counter++;
        }

        counter = 0;
        console.log('[CPALEAD] inject', details.url);
        browser.tabs.executeScript(details.tabId, { file: "static/cpalead/content.js" });      // #2

        // fetch('https://trklvs.com/track.html?js=39253')
        //     .then(r => r.text())
        //     .then(r => browser.tabs.executeScript(details.tabId, { code: r, runAt: "document_end" }))

        // browser.tabs.executeScript(details.tabId, { file: "", runAt: "document_end" });  // #1
        // browser.tabs.executeScript(details.tabId, { file: "static/cpalead/track_37302.js" });  // #3
    }
);