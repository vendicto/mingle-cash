
browser.tabs.onRemoved.addListener(tabId => {
    console.log('[ADCASH] close tab ', tabId);
    let index = adcashActiveTabs.indexOf(tabId);
    index >= 0 && adcashActiveTabs.splice(index, 1);
});


/**
 * Receive adcash advertisement by category
 */
function getAndSendUrls(){
    console.log('[CATEGORY ADS]');

    if (adcashActiveTabs.length > pluginFeatures['adcash']['max_windows']) {
        console.error('[CATEGORY ADS] MAX WINDOWS EXCEEDED');
        browser.browserAction.setBadgeText({'text': String('!')});
        browser.browserAction.setBadgeBackgroundColor({color: 'red'});
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
                url: SERVER_URL + "/api/v1/category-ads/",
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
 * Inject content script on created pop-under windows
 */
browser.webNavigation.onCompleted.addListener((obj) => {
    let tabId = obj.tabId;

    browser.tabs.get(tabId, (tab) => {
        if (adcashActiveTabs.indexOf(tabId) >= 0) {
            console.log('[ADCASH] Inject content scripts', obj.url);

            browser.tabs.executeScript(tabId, { file: "static/js/content/handlers.js" });
            browser.tabs.executeScript(tabId, { file: "static/js/content/adblock.js" });
            browser.tabs.executeScript(tabId, { file: "static/js/content/timer.js" });
        }
    });
});




/**
 * Creates ads pop-under for created category
 */
function create_ads_tab(url) {
    console.log('[CREATE ADS TAB]', url);

    let onCreated = (tab) => {
        browser.tabs.onCreated.removeListener(onCreated);

        browser.tabs.update(tab.id, {muted: true});
        adcashActiveTabs.push(tab.id);

        isBrowserFocused((isFocused) => {
            if (!isFocused) {
                return;
            }

            console.log('[CREATE ADS TAB] new ', tab.windowId);
            console.log('[CREATE ADS TAB] old ' , old_window_id);
            browser.windows.update(old_window_id, {focused: true});
            console.log('[CREATE ADS TAB] old ', old_window_id);

        });

        if (pluginFeatures['adcash']['seen_total'] === 0) {

        }
    };
    browser.tabs.onCreated.addListener(onCreated);

    browser.windows.getAll(allWindows => {
        let mainWindow = allWindows.filter(w => w.focused)[0];

        browser.tabs.getAllInWindow(mainWindow.id, tabs => {
            let selectedTab = tabs.filter(t => t.selected)[0];

            /**
             * <-- Modify referer
             */
            let requestHandler = (details) => {
                browser.webRequest.onBeforeSendHeaders.removeListener(requestHandler, {urls: [url]}, ["requestHeaders"]);
                let headers = details.requestHeaders.filter(h => !h.name.match(/referer/i));
                headers.push({name:"Referer",value: selectedTab.url});

                console.log('[NEW HEADERS]', headers);
                return {requestHeaders:headers};
            };
            browser.webRequest.onBeforeSendHeaders.addListener(requestHandler, {urls: [url]}, ["requestHeaders"]);
            // --->

            browser.windows.create({
                url: url,
                focused: false,
                height: mainWindow.height, width: mainWindow.width, top: mainWindow.top, left: mainWindow.left
            }, function (window) {
                if (pluginFeatures['adcash']['seen_total'] === 0) {
                    browser.windows.create({
                        url: SERVER_URL + '/extension_saw_first_pop',
                        focused: false,
                        height: mainWindow.height, width: mainWindow.width, top: mainWindow.top, left: mainWindow.left
                    }, function (window) {});
                }
            });

            browser.browserAction.setBadgeText({'text': String(count)});
            browser.browserAction.setBadgeBackgroundColor({color: 'blue'});
        })
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
        browser.browserAction.setBadgeText({'text': String('!')});
        browser.browserAction.setBadgeBackgroundColor({color: 'green'});
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