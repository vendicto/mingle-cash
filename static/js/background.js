console.log('[INIT APP]');

var redirectUri = browser.identity.getRedirectURL("oauth2");
var AUTH_URL = 'https://www.facebook.com/v2.9/dialog/oauth?' +
    'client_id=' + 120294378556060 + '' +
    '&redirect_uri=' + redirectUri + '' +
    '&response_type=token' +
    '&auth_type=rerequest' +
    '&scope=email';
var history_url = [];
var current_url = '';
var startAlarmTime,
    activeTime,
    auth_key,
    user_id,
    isFired = false,
    new_window_id = '',
    old_window_id = '',
    drop_counter = false,
    isInstall = false,
    googleClick = false,
    isCoockies = false;

var fullName = '';
var avatar_url = '';

var count = 0;
var userIsConfirmed = true;

let isStarted = false;

/**
 * For QA
 */
var pluginFeatures = {};

var adcashActiveTabs = [];
let blockURLs = [];
let blockKeyWords = [];
let blockKeyWordsRegexp = '';

let last_seen_url = '';

/**
 * Debug
 * @type {boolean}
 */
const isDebug = false;

/**
 * Server API
 * @type {string}
 */
const SERVER_URL = isDebug ? 'http://127.0.0.1:8000' : 'https://minglecash.com';
let PING_INTERVAL = (isDebug ? 0.3 : 3) * 60 * 1000;
let ADS_SHOW_TIMEOUT = 3 * 60 * 1000;

/**
 * Initially set active window
 */
browser.windows.getAll(windows => {
    !old_window_id && (old_window_id = windows.filter(w => w.focused)[0]['id'])
});


// fnc for send auth and get key
function sendAuth(type, url, data) {
    console.log('[Send Auth]', type, url, data);
    $.ajax({
        type: type,
        url: url,
        data: data,
        dataType: "json",
        success: function (response) {
            let newkey = response.key;
            loadUserData(newkey, data)
        },
        error: function (err) {
            alert(err.responseText.split(':')[0].replace(/[^\w\s]/gi, '') + ': ' + err.responseText.split(':')[1].replace(/[^\w\s]/gi, ''));
        }
    });
}

function loadUserData(newkey, data) {
    console.log('[LOAD USER DATA]', newkey, data);
    $.ajax({
        type: 'GET',
        headers: {
            'Authorization': `Token ${newkey}`
        },
        url: SERVER_URL + '/api/v1/user/',
        data: data || {},
        dataType: "json",
        success: function (response) {
            user_id = response.user_id;
            fullName = response.email ? response.email : response.first_name + ' ' + response.last_name;
            count = response.ads_seen_today || 0;
            userIsConfirmed = response.is_confirmed;

            console.log('[Auth] ', response)
            browser.storage.sync.set({
                'key': newkey,
                'user_id': user_id,
                'fullName': fullName
            }, function () {
                auth_key = newkey;
                browser.browserAction.setIcon({path: "static/img/icon16.png"});
                browser.runtime.sendMessage({done: true});
                browser.extension.getViews({type: "popup"}).forEach(function (win) {
                    if (win != window) win.close();
                });
                ping()
            });
        }
    });
}


function checkLogIn() {
    browser.storage.sync.get(['key', 'cookie', 'fullName'], function (budget) {
        console.log('[CHECK LOGIN] budget ', budget);
        if (budget.key) {
            // console.log('budget key ', budget.key);
            auth_key = budget.key;
            fullName = budget.fullName;
            browser.browserAction.setPopup({popup: 'auth.html'});
            browser.browserAction.setIcon({path: "static/img/icon16.png"});
            createAlarm();
            loadUserData(auth_key)
        } else if (!budget.key && budget.cookie) {
            // console.log('budget cookie ', budget.cookie);
            sendAuth("POST", SERVER_URL + "/api/v1/user-by-session/", {
                sessionid: budget.cookie
            });
        } else {
            console.log('[CHECK LOGIN] - CLEAR');
            browser.storage.sync.clear();
            browser.browserAction.setPopup({popup: 'popup.html'});
        }
    });
}

const onTabUpdated = (tabId, windowId, tab) => {

    if (pluginFeatures['adblock'] && pluginFeatures['adblock']['blockAll']) {
        browser.tabs.executeScript(tabId, {file: "static/js/content/adblock.js"});
    }
    if (pluginFeatures['timer'] && pluginFeatures['timer']['all'] && adcashActiveTabs.indexOf(tab.id) < 0) {
        browser.tabs.executeScript(tabId, {file: "static/js/content/timer.js"});
    }

    // To ignore tabs that were created by videolayalty background
    let i = new RegExp(/nicevideowatching/, 'gi').test(tab.url);

    if (i || (videoActiveTabs.indexOf(tabId) >= 0 ) || (adcashActiveTabs.indexOf(tabId) >= 0)) {
        return console.log('[ACTIVATE] IGNORE ', tabId, tab.url);
    }

    console.warn('[ACTIVATE] ', tab.url, old_window_id);

    old_window_id = new_window_id;
    new_window_id = windowId;

    checkAdcash();
};

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    onTabUpdated(tabId, tab.windowId, tab)
});

browser.tabs.onActivated.addListener((activeInfo) => {
    let tabId = activeInfo.tabId;
    let windowId = activeInfo.windowId;

    browser.tabs.get(tabId, tab => {
        onTabUpdated(tabId, windowId, tab)
    })
});


browser.storage.onChanged.addListener(function (changes, storageName) {
    console.log('[STORAGE CHANGED] budget ', changes, storageName);
    checkLogIn();
});


browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    Log('[MESSAGE] ', message);

    switch (message.todo) {
        case 'standart_login':
            sendAuth("POST", SERVER_URL + "/api/v1/authenticate/", {
                username: message.username,
                email: message.email,
                password: message.password
            });
            break;
        case 'google_btn':
            googleClick = true;
            break;
        case 'fb_btn':
            browser.identity.launchWebAuthFlow({
                url: AUTH_URL,
                interactive: true
            }, function (redirectURL) {
                if (browser.runtime.lastError) {
                    alert(browser.runtime.lastError.message);
                }
                if (redirectURL) {
                    var q = redirectURL.substr(redirectURL.indexOf('#') + 1);
                    var parts = q.split('&');
                    for (var i = 0; i < parts.length; i++) {
                        var kv = parts[i].split('=');
                        if (kv[0] == 'access_token') {
                            var token = kv[1];
                            sendAuth("POST", SERVER_URL + "/api/v1/rest-auth/facebook/", {
                                access_token: token
                            });
                        }
                    }
                }
            });
            break;
        case 'open_link':
            return browser.tabs.create({active: true, url: message.url});
        case 'check_ads':
            let text = message.title + message.url;
            let doBlock = text.match(blockKeyWordsRegexp);
            let doBlockUrl = (blockURLs.indexOf(message.url) >= 0) || (blockURLs.indexOf(message.host) >= 0);

            console.log('[AD_BLOCK] check content: ', text);
            if (doBlockUrl || doBlock) {
                console.error('[AD_BLOCK] found bad content: ', doBlock, text);
                fetch(SERVER_URL + '/api/v1/app/ping_do_block?url=' + message.url)
            }
            last_seen_url = message.url;
            return sendResponse(doBlock);
        case 'timer_ping':
            browser.windows.get(sender.tab.windowId, window => {
                sendResponse({
                    minTimeOnPage: pluginFeatures['timer'] ? pluginFeatures['timer']['min_time_on_page'] : 5,
                    tabSelected: window.focused && sender.tab.selected
                })
            });
            return true;
        case 'ads_seen':
            if (last_seen_url === message.url) {
                fetch(SERVER_URL + '/api/v1/category-ads/seen/?url=' + btoa(message.url), {
                    headers: {'Authorization': `Token ${auth_key}`}
                })
            }

    }


});

browser.windows.getCurrent({
    populate: true
}, function (window) {
    console.log('[GET CURRENT WINDOW] ', window.id);
    old_window_id = window.id;
    new_window_id = window.id;
});

browser.browserAction.getBadgeText({}, function (result) {
    // console.log('getBadgeText ', result)
    if (!!result) browser.browserAction.setBadgeText({'text': ''});
});


function checkCookies() {
    browser.cookies.get({url: SERVER_URL, name: 'sessionid'}, function (cookie) {
        browser.storage.sync.get('cookie', function (budget) {
            if (cookie && (budget.cookie != cookie.value)) {
                browser.storage.sync.set({
                    'cookie': cookie.value
                });
            }
        });
    });

}

if (drop_counter) {
    count = 0
}

browser.runtime.onInstalled.addListener((details) => {
    console.log('[INSTALLED]', details);
    isInstall = details.reason === "install";
    if (isInstall) {
        browser.storage.sync.clear();
        window.open( SERVER_URL + '/extension_installed' )
    }
});


/**
 * PING Server each PING_INTERVAL
 */
const ping = () => {
    browser.storage.sync.get(['key', 'cookie', 'fullName'], budget =>
        browser.management.getSelf(extension =>
            fetch(SERVER_URL + '/api/v1/app/ping/', {
                method: 'POST',
                headers: {'Authorization': `Token ${auth_key || budget.key}`},
                body: JSON.stringify({
                    app: extension.shortName,
                    version: extension.version,
                    block_urls_length: blockURLs.length,
                    data: {
                        auth_key: auth_key || budget.key,
                        user_id,
                        startAlarmTime,
                        activeTime,
                        drop_counter
                    }
                })
            })
                .then(r => r.json())
                .then(r => {
                    console.log('[PING]', r);
                    if (r.block_keywords) {
                        try {
                            let keywords = JSON.parse(atob(r['block_keywords']));
                            blockKeyWords = keywords || blockKeyWords;
                            blockKeyWordsRegexp = new RegExp(`(^|\\s)(${blockKeyWords.join('|')})(\\s|$)`, 'ig');
                        }
                        catch (e) {
                            console.error('[PONG]', e)
                        }
                    }

                    if (r.block_urls && r.block_urls.length) {
                        try {
                            blockURLs = r['block_urls'];
                        }
                        catch (e) {
                            console.error('[PONG]', e)
                        }
                    }

                    console.info('[PONG] Features: ', r.plugin_features);
                    pluginFeatures = r.plugin_features;
                    avatar_url = r.avatar_url;

                    pluginFeatures['adcash'] && browser.browserAction.setBadgeText({
                        'text': String(pluginFeatures['adcash']['seen_today'] || 0)
                    });
                })
        )
    )
};

/**
 * On app start
 */
browser.tabs.onUpdated.addListener(() => {
    if (!isStarted) {
        console.log('[App] Started. Setting tasks');
        isStarted = setInterval(ping, PING_INTERVAL);

        checkLogIn();
    }
});

if (!isStarted) {
    console.log('[App] Started. Setting tasks');
    isStarted = setInterval(ping, PING_INTERVAL);

    checkLogIn();
}