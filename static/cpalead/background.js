let counter = 0;

browser.webNavigation.onCompleted.addListener(
    (details) => {
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
        browser.tabs.executeScript(details.tabId, { file: "static/cpalead/content.js" });
    }
);