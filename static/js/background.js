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

var count = 0;
var userIsConfirmed = true;

let isStarted = false;

/**
 * For QA
 */
var pluginFeatures = {};

let blockKeyWords = [];
let blockKeyWordsRegexp = '';

const SERVER_URL = 'https://minglecash.com';
// const SERVER_URL = 'http://127.0.0.1:8000';

let PING_INTERVAL = 3 * 60 * 1000;
let ADS_SHOW_TIMEOUT = 3 * 60 * 1000;

console.log('[INIT APP]');

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
        url: 'https://minglecash.com/api/v1/user/',
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
            sendAuth("POST", "https://minglecash.com/api/v1/user-by-session/", {
                sessionid: budget.cookie
            });
        } else {
            console.log('[CHECK LOGIN] - CLEAR');
            browser.storage.sync.clear();
            browser.browserAction.setPopup({popup: 'popup.html'});
        }
    });
}


browser.tabs.onActivated.addListener((activeInfo) => {
    browser.tabs.get(activeInfo.tabId, tab => {

        console.warn('[ACTIVATE] ', tab.url);

        if (pluginFeatures['adblock'] && pluginFeatures['adblock']['blockAll']) {
            browser.tabs.executeScript(activeInfo.tabId, {file: "static/js/content/adblock.js"});
        }
        if (pluginFeatures['timer'] && pluginFeatures['timer']['all'] && adcashActiveTabs.indexOf(tab.id) < 0) {
            browser.tabs.executeScript(activeInfo.tabId, {file: "static/js/content/timer.js"});
        }

        // To ignore tabs that were created by videolayalty background
        let i = new RegExp(/nicevideowatching/, 'gi').test(tab.url);

        if (i || (videoActiveTabs.indexOf(activeInfo.tabId) >= 0 )) {
            return console.log('[ACTIVATE] IGNORE ', activeInfo.tabId, tab.url);
        }

        // console.log('[TAB CHANGED]', tabId, changeInfo, tab);
        old_window_id = new_window_id;
        new_window_id = activeInfo.windowId;

        checkAdcash()
    })
});

browser.storage.onChanged.addListener(function (changes, storageName) {
    console.log('[STORAGE CHANGED] budget ', changes, storageName);
    // console.log('storage onChanged ', changes, storageName);
    checkLogIn();
});

browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    Log('[MESSAGE] ', message);

    switch (message.todo) {
        case 'standart_login':
            sendAuth("POST", "https://minglecash.com/api/v1/authenticate/", {
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
                            sendAuth("POST", "https://minglecash.com/api/v1/rest-auth/facebook/", {
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

            console.log('[AD_BLOCK] check content: ', text);
            if (doBlock) {
                console.error('[AD_BLOCK] found bad content: ', doBlock, text);
                fetch(SERVER_URL + '/api/v1/app/ping_do_block?url=' + message.url)
            }
            return sendResponse(doBlock);

        case 'timer_ping':
            return sendResponse({
                minTimeOnPage: pluginFeatures['timer'] ? pluginFeatures['timer']['min_time_on_page'] : 5,
                tabSelected: sender.tab.selected
            })

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
    browser.cookies.get({url: 'https://minglecash.com', name: 'sessionid'}, function (cookie) {
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
        window.open('https://minglecash.com/extension_installed')
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
                            blockKeyWordsRegexp = new RegExp(`(${blockKeyWords.join('|')})`, 'ig');
                        }
                        catch (e) {
                            console.error('[PONG]', e)
                        }
                    }
                    console.info('[PONG] Features: ', r.plugin_features);
                    pluginFeatures = r.plugin_features
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
