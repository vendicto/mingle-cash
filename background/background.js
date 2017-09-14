let isChrome = (/google/i).test(navigator.vendor);
let browser = isChrome ? chrome : browser;

/**
 * Window
 */
let initialWindow = null;
let contentWindow = null;
let loaderWindow = null;

const WIN_KEY = 'minglecash_win_key';
const WINDOW_WIDTH = 350;
const WINDOW_TOP = 70; // top from window panel

const SERVER = 'https://minglecash.com';
// const SERVER = 'http://minglecash.com:8000';
const API_FB_INVITE = SERVER + '/api/v1/facebook/group/invite/';

// Facebook clinet Id
const CLIENT_ID = 120294378556060;
// const CLIENT_ID = 1620394001365874;

const AUTH_URL = 'https://www.facebook.com/v2.9/dialog/oauth?' +
    'client_id=' + CLIENT_ID + '' +
    '&redirect_uri=' + chrome.identity.getRedirectURL("oauth2") + '' +
    '&response_type=token' +
    '&auth_type=rerequest' +
    '&scope=email';


/**
 * Scheduler
 */
const ACTION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 Hours
const ACTION_CHECK_INTERVAL = 60 * 1000;    // 1 Minute
const ACTION_TIMEOUT_LS_KEY = 'FB_MINGLE_LAST_ACTION_TIME';

let invitesLeft = 5;

const getLastActionTime = () => {
    return  Number(localStorage.getItem(ACTION_TIMEOUT_LS_KEY) || 0)
};

const createWindow = (url, callback, options = {}) => {
    let window = localStorage.getItem(WIN_KEY);

    if (window) {
        console.log('[Create Window] ', url, window);
        return browser.windows.get(parseInt(window), () => browser.tabs.executeScript({ file: url || "popup/index.js"}));
    }

    const doCreateWindow = (initialWindow) => {
        browser.windows.create(Object.assign({
                url: url,
                type: 'popup',
                incognito: false,
                width: WINDOW_WIDTH,
                height: Math.round(initialWindow.height / 2),
                left: initialWindow.width - WINDOW_WIDTH,
                top: initialWindow.top + WINDOW_TOP
            }, options),
            window => {
                callback && callback(window, initialWindow)
            }
        );
    };

    initialWindow ? doCreateWindow(initialWindow) : browser.windows.getCurrent(doCreateWindow);
};

const createContentWindow = (url) => {
    createWindow(url, (window, initWindow) => {
        contentWindow = window;
        initialWindow = initWindow;
    })
};

const createTab = (url, windowId) => {
    browser.windows.get(windowId, () => {
        browser.tabs.create({url})
    })
};

/**
 * Send response as new message because previous message thread died after ajax or any other thread invocation
 * @param request {Object} Message request
 * @param sender {Object}
 * @param response {Object} response to send to front
 */
const responseMessageCallback = (request, sender, response) => {
    browser.tabs.sendMessage(sender.tab.id, Object.assign({action: request.action}, response));
};

/**
 * Business Logic -  Main Strategy
 */
const openWindow = () => {
    const actionTimeLeft = getTimeLeft();

    if (invitesLeft <= 0 && (actionTimeLeft < ACTION_TIMEOUT)) {
        return createContentWindow("popup/html/waiting.html");
    }

    if (getLastActionTime() && (actionTimeLeft > ACTION_TIMEOUT)) {
        return createContentWindow("popup/html/welcome_back.html");
    }

    // createContentWindow('https://www.facebook.com/groups/140328583180127/');  // TODO REAL GROUP
    createContentWindow('https://www.facebook.com/groups/121294971833048/');  // TEST GROUP
    showLoader();

};


/**
 * Make a kind of hijacking during the real FB page is loading
 */
const showLoader = () => {
    let options = contentWindow ? {
        width: contentWindow.width,
        height: contentWindow.height,
        left: contentWindow.left,
        top: contentWindow.top
    } : {};

    createWindow('popup/html/loader.html', (window) => loaderWindow = window, options); // Window to hide current loading state
};

const getTimeLeft = () => {
    const time = ACTION_TIMEOUT - (new Date().getTime() - getLastActionTime());
    return time > 0 ? time : 0;
};

const getInvitesLeft = (callback) => {
    fetch(API_FB_INVITE, {
        headers: {"Authorization": "Token " + auth_key}
    })
        .then(r => r.json())
        .then(r => {
            console.log('[RESPONSE - GET INVITES LEFT] ', r);
            invitesLeft = r.invites_left !== undefined ? r.invites_left : invitesLeft;

            if (!r.error && !invitesLeft) {
                browser.tabs.getSelected( tab => {
                    browser.tabs.update(tab.id, {
                        url: "popup/html/waiting.html"
                    })
                });
            } else {
                callback(Object.assign({invites_left: invitesLeft}, r || {}))
            }
        });
};

const sendInvite = (data, callback) => {
    fetch(API_FB_INVITE, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Authorization": "Token " + auth_key,
            "Content-type": "application/json"
        }
    })
        .then(r => r.json())
        .then(r => {
            console.log('[RESPONSE - SEND INVITE] ', r);
            callback(Object.assign({invites_left: invitesLeft}, r || {}))
        })
};


/**
 * On FB loaded
 */
let filter = isChrome
    ? { urls : ["http://*.facebook.com/*", "https://*.facebook.com/*"], types: ['main_frame'] }
    : { url : [{hostContains: "facebook.com"}] };

browser.webNavigation.onCompleted.addListener(
    (details) => {
        if (contentWindow) {
            browser.tabs.executeScript(contentWindow.tabs[0].id, { file: "popup/js/handlebars.min.js" });
            browser.tabs.executeScript(contentWindow.tabs[0].id, { file: "popup/index.js" });
        }
    },
    filter
);


/**
 * Listen for data request & responds with the view html
 */
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    sendResponse = request.sendResponse || sendResponse;
    let responseCallback = responseMessageCallback.bind(this, request, sender);

    console.log(request);
    switch (request.action) {
        case "fb_welcome_back":
            localStorage.setItem(ACTION_TIMEOUT_LS_KEY, 0);
            return openWindow();
        case "fb_send_invite":
            return sendInvite(request.data, responseCallback);
        case "fb_get_time_left":
            return sendResponse(getTimeLeft());
        case "fb_get_invites_left":
            return getInvitesLeft(responseCallback);
        case "fb_open_link":
            return createTab(request.url, initialWindow.id);
        case "fb_show_loader":
            return showLoader();
        case "fb_hide_loader":
            return setTimeout(() => {
                loaderWindow && browser.windows.remove(loaderWindow.id);
                loaderWindow = null;
            }, 300);
    }
});


/**
 * Icon click action
 */
browser.browserAction.onClicked.addListener(() => {
    if (contentWindow || loaderWindow) {
        contentWindow && browser.windows.remove(contentWindow.id);
        return loaderWindow && browser.windows.remove(loaderWindow.id);
    }

    openWindow()
});

browser.windows.onRemoved.addListener((windowId) => {
    contentWindow && (windowId === contentWindow.id) && (contentWindow = null);
    loaderWindow && (windowId === loaderWindow.id) && (loaderWindow = null);
});

/**
 * On lost focus
 */
browser.windows.onFocusChanged.addListener((windowId) => {
    if ((loaderWindow || contentWindow) && windowId > 1) {
        (loaderWindow && (windowId !== loaderWindow.id)) &&
        (contentWindow && (windowId !== contentWindow.id)) &&
        browser.windows.remove(contentWindow.id)
    }
});


/**
 * Badge color
 */
browser.browserAction.setBadgeBackgroundColor({color: '#d35400'});


/**
 * Interval for chech Action available or not
 */
setInterval(() => {
    if ((getTimeLeft() <= 0) && !invitesLeft) {
        invitesLeft = 5; // Reset count of invites
        localStorage.setItem(ACTION_TIMEOUT_LS_KEY, 0);
        browser.browserAction.setBadgeText({ text : "!" });
    }
    browser.browserAction.setBadgeText({ text : "" });
}, ACTION_CHECK_INTERVAL);