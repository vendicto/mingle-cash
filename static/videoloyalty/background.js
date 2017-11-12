const RUN_TASK_INTERVAL = 10 * 1000;
const DEFAULT_WINDOWS_COUNT = 3;
const DEFAULT_ROTATION_INTERVAL = 15 * 60 * 1000;
const DEFAULT_REOPEN_WINDOW_INTERVAL = 40 * 60 * 1000;

let videoActiveTabs = [];
let taskIsActive = false;
let nextRotationTaskTime = null;
let nextReopenWindowsTime = null;

let isVideoStarted = false;

/**
 * Listeners
 */

browser.webNavigation.onCompleted.addListener( details => {
    if (!isActive()) return;

    let re = new RegExp(pluginFeatures.videos.matching_url, 'gi');
    console.log('[VIDEO] Navigation', re, details.url);
    if (re.test(details.url) ) {
        injectScript(details)
    }
});

browser.runtime.onMessage.addListener( (message, sender, sendResponse) => {
    switch(message.action) {
        case 'start_video':
            taskIsActive = true;
            return runTask();
        case 'video_get_rotation_time':
            return sendResponse(pluginFeatures.videos.rotation_timeout)
    }
});

browser.tabs.onRemoved.addListener((tabId) => {
    console.log('[VIDEO] close tab ', tabId);
    let index = videoActiveTabs.indexOf(tabId);
    index >= 0 && videoActiveTabs.splice(index, 1);
});


/**
 * Task Methods
 */

const isActive = () => {
    return !!pluginFeatures.videos;
};

const openWindow = () => {
    console.log('[VIDEO] Creating new window ');

    chrome.windows.getAll(allWindows => {
        let mainWindow = allWindows[0];
        chrome.windows.create({
            url: pluginFeatures.videos.url,
            focused: false,
            height: mainWindow.height,
            width: mainWindow.width,
            top: mainWindow.top,
            left: mainWindow.left
        }, function (window, a, b, c, d) {
            console.log('[VIDEO] Created window id: ', window.id, a, b, c, d);

            isBrowserFocused((isFocused) => {
                console.log('[VIDEO] browser is focused: ', isFocused);

                // Mute created tabs
                try {
                    browser.tabs.getAllInWindow(window.id, (tabs) => {
                        for (let tab of tabs) {
                            browser.tabs.update(tab.id, {muted: true});
                            videoActiveTabs.push(tab.id);
                        }

                        if (!isFocused) {
                            return;
                        }

                        console.log('[VIDEO] focus on previous tab: ', isFocused);
                        browser.windows.update(old_window_id, {focused: true});
                    })
                } catch (e) {}
            });

        });

        browser.browserAction.setBadgeText({'text': String(count)});
    })
};

const injectScript = (details) => {
    console.log('[VIDEO] Inject video ', details);
    browser.tabs.executeScript(details.tabId, { file: "static/videoloyalty/content.js" , allFrames: true, runAt: 'document_idle'});
};

const changeChannel = () => {
    let index = (Math.random() * videoActiveTabs.length).toFixed(0);
    let tab = videoActiveTabs[index] || videoActiveTabs[0];

    console.log('[VIDEO] Switch video', tab);
    tab && browser.tabs.sendMessage(tab, {action: 'video_change_channel'});
};

const planNewTask = () => {
    nextRotationTaskTime = new Date().getTime() + (pluginFeatures.videos['channel_rotation_interval'] || DEFAULT_ROTATION_INTERVAL);
    console.log('[VIDEO] new task', nextRotationTaskTime);
};

const planReopenWindowTask = () => {
    nextReopenWindowsTime = new Date().getTime() + (pluginFeatures.videos['window_reopen_interval'] || DEFAULT_REOPEN_WINDOW_INTERVAL);
    console.log('[VIDEO] new task', nextReopenWindowsTime);
};

const getMaxWindowsCount = () => {
    return pluginFeatures.videos['max_windows'] || DEFAULT_WINDOWS_COUNT
};

const reopenWindows = () => {
    if (videoActiveTabs.length < getMaxWindowsCount()) {
        console.log('[VIDEO] open window');
        openWindow();
        setTimeout(reopenWindows, 4000)
    }
};

const closeAllWindows = () => {
    browser.tabs.remove(videoActiveTabs)
};


/**
 * Main strategy
 */
const runTask = () => {
    if (!isActive()) return;

    if (!nextRotationTaskTime) {
        planNewTask()
    }

    if (!nextReopenWindowsTime) {
        planReopenWindowTask()
    }

    if (nextRotationTaskTime < new Date().getTime()) {
        changeChannel();
        planNewTask()
    }

    if (nextReopenWindowsTime < new Date().getTime()) {
        closeAllWindows();
        planReopenWindowTask()
    }

    reopenWindows()
};

/**
 * On app start
 */
browser.tabs.onUpdated.addListener(() => {
    if (!isVideoStarted) {

        setInterval(runTask, RUN_TASK_INTERVAL);
        isVideoStarted = true;
    }
});
