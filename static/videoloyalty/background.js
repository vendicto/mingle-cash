const activeTabs = [];
const isActive = () => !!pluginFeatures.videos;

let channelRotationInterval = 60 * 1000;

const injectScript = (details) => {
    console.log('[VIDEO] Inject video ', details);
    browser.tabs.executeScript(details.tabId, { file: "static/videoloyalty/content.js" , allFrames: true, runAt: 'document_idle'});
};

const refreshTabList = () => {
    for (let i = 0; i < activeTabs.length; i++) {
        try {
            browser.tabs.get(activeTabs[i], tab => {
                if (!tab) {
                    activeTabs.splice(i, 1);
                    console.log('[VIDEO] old windows: ' + tab);
                }
            })
        } catch (e) {
            activeTabs.splice(i, 1)
        }
    }

}

const openWindows = () => {
    console.log('[VIDEO] Open windows ');

    refreshTabList();
    if (activeTabs.length >= 3) {
        return console.log('[VIDEO] Try get old windows ');
    }

    chrome.windows.getAll(allWindows => {
        let mainWindow = allWindows[0];
        chrome.windows.create({
            url: pluginFeatures.videos.url,
            focused: false,
            height: mainWindow.height,
            width: mainWindow.width,
            top: mainWindow.top,
            left: mainWindow.left
        }, function (window) {
            console.log('[VIDEO] Open windows ');

            browser.tabs.getAllInWindow(window.id, (tabs) => {
                for (let tab of tabs) {
                    browser.tabs.update(tab.id, {muted: true});
                    activeTabs.push(tab.id);
                }
            });
            browser.windows.update(old_window_id || new_window_id, {focused: true});

        });

        browser.browserAction.setBadgeText({'text': String(count)});
    })
};

browser.webNavigation.onCompleted.addListener( details => {
    if (!isActive()) return;

    let re = new RegExp(pluginFeatures.videos.matching_url, 'gi');
    console.log('[VIDEO] Navigation', re, details.url);
    if (re.test(details.url) ) {
        injectScript(details)
    }
});


browser.runtime.onMessage.addListener( (message, sender, sendResponse) => {
    if (!isActive()) return;

    let options = pluginFeatures.videos;
    switch(message.action) {
        case 'start_video':
            for (let i = options.max_windows; i > 0; i--) {
                openWindows()
            }

            return;
        case 'video_get_rotation_time':
            return sendResponse(options.rotation_timeout)
    }
});

setInterval(() => {
    if (!isActive() || !activeTabs.length) return;

    refreshTabList();

    let options = pluginFeatures.videos;
    channelRotationInterval = options['channel_rotation_interval'] || channelRotationInterval;

    let index = (Math.random() * activeTabs.length).toFixed(0);
    let tab = activeTabs[index] || activeTabs[0];

    console.log('[VIDEO] Switch video', tab);
    browser.tabs.sendMessage(tab, {action: 'video_change_channel'});
}, channelRotationInterval);