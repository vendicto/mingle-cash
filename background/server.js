var auth_key,
    user_id,
    window_id = '',
    drop_counter = false,
    submittedFBLogin = false,
    loggedInFacebook = false;

var firstName = '';
var lastName = '';
var fullName = '';
var email = '';


var count = 0;

// fnc for send auth and get key
function sendAuth(type, url, data, callback) {
    $.ajax({
        type: type,
        url: url,
        data: data,
        dataType: "json",
        success: function (response) {
            // console.log('response', response);
            let newkey = response.key;
            $.ajax({
                type: 'GET',
                headers: {
                    'Authorization': `Token ${newkey}`
                },
                url: SERVER + '/api/v1/user/',
                data: data,
                dataType: "json",
                success: function (response) {
                    chrome.storage.sync.set({
                        'key': newkey,
                        'user_id': response.user_id
                    }, function () {
                        user_id = response.user_id;
                        auth_key = newkey;
                        email = response.email;
                        lastName = response.last_name;
                        first_name = response.first_name;
                        fullName = response.first_name + ' ' + response.last_name;
                        chrome.browserAction.setIcon({path: "/icons/icon16.png"});
                        chrome.runtime.sendMessage({done: true});
                        chrome.extension.getViews({type: "popup"}).forEach(function (win) {
                            if (win != window) win.close();
                        });

                        // TODO on G+ access
                        if (data.access_token) {
                            submittedFBLogin = true;
                        }

                        callback && callback({user_id, fullName, email});
                        checkLogIn();
                    });
                }
            });
        },
        error: function (err) {
            try {
                const resp = JSON.parse(err.responseText);
                const text = Object.keys(resp).map(k => resp[k]).join('\n');
                callback && callback({error: text});
            }
            catch (e) {
                err.responseText && alert(err.responseText.split(':')[0].replace(/[^\w\s]/gi, '') + ': ' + err.responseText.split(':')[1].replace(/[^\w\s]/gi, ''));
            }
        }
    });
}

function checkLogIn() {
    chrome.storage.sync.get('key', function (budget) {
        if (budget.key) {
            auth_key = budget.key;
        }
    });
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    sendResponse = message.sendResponse || sendResponse;
    let responseCallback = responseMessageCallback.bind(this, message, sender);

    switch (message.action) {
        case 'standart_login':
            return sendAuth("POST", SERVER + "/api/v1/authenticate/", {
                username: message.username,
                email: message.email,
                password: message.password
            }, responseCallback);

        case 'google_btn':
            return chrome.identity.getAuthToken({
                interactive: true
            }, access_token => {
                if (chrome.runtime.lastError) {
                    return alert(chrome.runtime.lastError.message);
                }

                if (access_token) {
                    chrome.identity.getProfileUserInfo(function (email, id) {
                        console.log('[Google Login]', email, id);
                    });
                    sendAuth("POST", SERVER + "/api/v1/rest-auth/google/", { access_token }, responseCallback);
                }
            });

        case 'fb_btn':
            // Not using native launchWebAuthFlow to render popups inside current window
            let window;
            let cb = (tabId, tab) => {
                if (/access_token=/.test(tab.url)) {
                    browser.windows.remove(window.id)
                    chrome.tabs.onUpdated.removeListener(cb);
                    var q = tab.url.substr(tab.url.indexOf('#') + 1);
                    var parts = q.split('&');
                    for (var i = 0; i < parts.length; i++) {
                        var kv = parts[i].split('=');
                        if (kv[0] == 'access_token') {
                            var access_token = kv[1];
                            console.log('access_token  ', access_token);
                            sendAuth("POST", SERVER + "/api/v1/rest-auth/facebook/", { access_token }, responseCallback);
                        }
                    }
                }
            };
            chrome.tabs.onUpdated.addListener(cb);
            return createWindow(AUTH_URL, win => window = win);

        case 'mc_get_username':
            return sendResponse(firstName || lastName || email.split('@')[0]);
        case 'mc_auth_key_exist':
            return sendResponse(!!auth_key);
        case 'mc_submitted_fb_login':
            message.submitted && (submittedFBLogin = true);
            return sendResponse(submittedFBLogin);
    }


});

chrome.windows.getCurrent({
    populate: true
}, function (window) {
    console.log('[getCurrent] windowId ', window && window.id);
    window_id = window && window.id;
});

chrome.browserAction.getBadgeText({}, function (result) {
    console.log('[getBadgeText] ', result)
    if (!!result) chrome.browserAction.setBadgeText({'text': ''});
});

function checkCookies() {
    chrome.cookies.get({url: 'https://www.facebook.com', name: 'c_user'}, function (cookie) {
        loggedInFacebook = !!cookie;
    });
}

checkCookies();
chrome.cookies.onChanged.addListener(function (info) {
    checkCookies();
});

if (drop_counter) {
    count = 0
}

