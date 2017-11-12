
const adcashActiveTabs = [];
const adcashInjectedTabs = [];


browser.tabs.onRemoved.addListener(tabId => {
    console.log('[ADCASH] close tab ', tabId);
    let index = adcashActiveTabs.indexOf(tabId);
    index >= 0 && adcashActiveTabs.splice(index, 1);
    let indexInjected = adcashInjectedTabs.indexOf(tabId);
    indexInjected >= 0 && adcashInjectedTabs.splice(indexInjected, 1);
});


/**
 * Receive adcash advertisement by category
 */
function getAndSendUrls(){
    console.log('[CATEGORY ADS]');

    if (adcashActiveTabs.length > pluginFeatures['adcash']['max_windows']) {
        console.error('[CATEGORY ADS] MAX WINDOWS EXCEEDED');
        return false
    }


    history_url = [];
    current_url = '';

    // get urls
    browser.history.search({text: '', maxResults: 20}, function(data) {
        data.forEach(function(page) {
            history_url.push(extractHostname(page.url));
        });
        console.log('[CATEGORY ADS]', history_url);
        //get current url
        browser.tabs.getSelected(null, function(tab) {
            current_url = tab.url;
            console.log('[CATEGORY ADS]', current_url);

            let current_time = new Date();
            $.ajax({
                type: "GET",
                headers: {
                    'Authorization' : `Token ${auth_key}`
                },
                url: "https://minglecash.com/api/v1/category-ads/",
                data: {url: current_url, history: history_url, user_id: user_id, time: current_time.toDateString()},
                dataType: "json",
                success: function (data) {
                    drop_counter = data.drop_counter;
                    if(data.drop_counter) count = 0;
                    count = data.ads_seen_today || 0;

                    create_ads_tab(data.max_category);
                }
            });
        });

    });
}

/**
 * Creates ads pop-under for created category
 */
function create_ads_tab(url) {
    console.log('[CREATE ADS TAB]', url);

    let cb = (obj) => {
        browser.webNavigation.onCommitted.removeListener(cb);

        let tab = obj.tabId;

        if (adcashInjectedTabs.indexOf(tab) < 0) {
            console.log('[CREATE ADS TAB]', url);

            adcashInjectedTabs.push(obj.tabId);
            browser.tabs.executeScript(obj.tabId, { file: "static/js/content/handlers.js" });
            browser.tabs.executeScript(obj.tabId, { file: "static/js/content/adblock.js" });
            browser.tabs.executeScript(obj.tabId, { file: "static/js/content/timer.js" });
        }
    };

    browser.webNavigation.onCommitted.addListener(cb);

    browser.windows.getAll(allWindows => {
        let mainWindow = allWindows[0];
        browser.windows.create({
            // tabId: tab.id,
            url: url,
            focused: false,
            height: mainWindow.height,
            width: mainWindow.width,
            top: mainWindow.top,
            left: mainWindow.left
        }, function (window) {
            isBrowserFocused((isFocused) => {
                browser.tabs.getAllInWindow(window.id, (tabs) => {
                    for (let tab of tabs) {
                        browser.tabs.update(tab.id, {muted: true});
                        adcashActiveTabs.push(tab.id);
                    }

                    if (!isFocused) {
                        return;
                    }

                    browser.windows.update(old_window_id, {focused: true});
                });
            });
        });

        browser.browserAction.setBadgeText({'text': String(count)});
    })
}

function createAlarm(){
    if(startAlarmTime){
        startAlarmTime = activeTime = new Date(startAlarmTime);
    } else {
        startAlarmTime = activeTime = new Date();
    }
    console.log('[CREATE ALARM]', startAlarmTime);
}


function firedAlarm() {
    console.log('[FIRED ALARM]', startAlarmTime);
    // console.log('firedAlarm');
    isFired = true;
    browser.alarms.clear("myAlarm");
}


/**
 * tabs.onActivated
 * handler
 */
function checkAdcash() {
    if (pluginFeatures['adcash'] && pluginFeatures['adcash']['limit_exceeded']) {
        console.warn('[ADCASH] DAILY LIMIT EXCEEDED');
        return
    }

    checkCookies();
    activeTime = new Date();
    ADS_SHOW_TIMEOUT = pluginFeatures['adcash'] ? pluginFeatures['adcash']['ads_show_timeout'] : ADS_SHOW_TIMEOUT;

    if(auth_key && (startAlarmTime.valueOf() + ADS_SHOW_TIMEOUT <= activeTime.valueOf())){
        startAlarmTime = activeTime;
        if (getAndSendUrls() !== false) {
            createAlarm();
        }
    }
}