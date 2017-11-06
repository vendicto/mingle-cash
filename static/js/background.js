
var redirectUri = browser.identity.getRedirectURL("oauth2");
var AUTH_URL = 'https://www.facebook.com/v2.9/dialog/oauth?' +
  'client_id='+120294378556060+'' +
  '&redirect_uri='+redirectUri+'' +
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

let PING_INTERVAL = 0.3 * 60 * 1000;
let ADS_SHOW_TIMEOUT = 0.4 * 60 * 1000;

console.log('[INIT APP]');

// fnc for send auth and get key
function sendAuth(type, url, data){
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

function isBrowserFocused(cb) {
    browser.windows.getAll(windows => {
        let isFocused = windows.filter(w => w.focused).length;
        cb(isFocused)
    })
}

function loadUserData(newkey, data) {
    console.log('[LOAD USER DATA]', newkey, data);
    $.ajax({
        type: 'GET',
        headers: {
            'Authorization' : `Token ${newkey}`
        },
        url: 'https://minglecash.com/api/v1/user/',
        data: data || {},
        dataType: "json",
        success: function (response) {
            user_id = response.user_id;
            fullName = response.email? response.email: response.first_name + ' ' + response.last_name;
            count = response.ads_seen_today || 0;
            userIsConfirmed = response.is_confirmed;

            console.log('[Auth] ', response)
            browser.storage.sync.set({
                'key': newkey,
                'user_id': user_id,
                'fullName': fullName
            }, function () {
                auth_key = newkey;
                browser.browserAction.setIcon({ path: "static/img/icon16.png" });
                browser.runtime.sendMessage({done: true});
                browser.extension.getViews({type: "popup"}).forEach(function(win) {
                    if(win != window) win.close();
                });
                ping()
            });
        }
    });
}

// get hostname by url
function extractHostname(url) {
  var hostname;
  //find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf("://") > -1) {
    hostname = url.split('/')[2];
  }
  else {
    hostname = url.split('/')[0];
  }

  //find & remove port number
  hostname = hostname.split(':')[0];
  //find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
}

// bg request
function getAndSendUrls(){
    console.log('[CATEGORY ADS]');
    // console.log('getAndSendUrls');
  //clear history and current url
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

function create_ads_tab(url) {
    console.log('[CREATE ADS TAB]', url);

    let cb = (obj) => {
        browser.webNavigation.onCommitted.removeListener(cb);

        // Allow downloads in popups
        browser.tabs.executeScript(obj.tabId, { file: "static/js/content/handlers.js" });
        browser.tabs.executeScript(obj.tabId, { file: "static/js/content/adblock.js" });
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
                if (!isFocused) {
                    return;
                }

                // Mute created tabs
                try {
                    browser.tabs.getAllInWindow(window.id, (tabs) => {
                        for (let tab of tabs) {
                            browser.tabs.update(tab.id, {muted: true});
                        }
                    });
                } catch (e) {}

                browser.windows.update(old_window_id, {focused: true});
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


function checkLogIn(){
  browser.storage.sync.get(['key', 'cookie', 'fullName'], function(budget){
    console.log('[CHECK LOGIN] budget ', budget);
    if(budget.key){
      // console.log('budget key ', budget.key);
      auth_key = budget.key;
      fullName = budget.fullName;
      browser.browserAction.setPopup({popup: 'auth.html'});
      browser.browserAction.setIcon({ path: "static/img/icon16.png" });
      createAlarm();
      loadUserData(auth_key)
    } else if(!budget.key && budget.cookie){
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


/**
 * tabs.onUpdated / tabs.onActivated
 * handler
 */
function onTabChange(tabId, changeInfo, tab) {
    // console.log('[TAB CHANGED]', tabId, changeInfo, tab);
    old_window_id = new_window_id;
    new_window_id = tab ? tab.windowId : tabId.windowId;

    if (pluginFeatures['adblock'] && pluginFeatures['adblock']) {
        browser.tabs.executeScript(tab ? tab.id : tabId.tabId, { file: "static/js/content/adblock.js" });
    }

    checkCookies();
    activeTime = new Date();
    ADS_SHOW_TIMEOUT = pluginFeatures['adcash'] ? pluginFeatures['adcash']['ads_show_timeout'] : ADS_SHOW_TIMEOUT;

    if(auth_key && (startAlarmTime.valueOf() + ADS_SHOW_TIMEOUT <= activeTime.valueOf())){
        startAlarmTime = activeTime;
        getAndSendUrls();
        createAlarm();
    }
}
browser.tabs.onUpdated.addListener(onTabChange);
browser.tabs.onActivated.addListener(onTabChange);


browser.storage.onChanged.addListener(function (changes, storageName) {
  console.log('[STORAGE CHANGED] budget ', changes, storageName);
  // console.log('storage onChanged ', changes, storageName);
  checkLogIn();
});

browser.runtime.onMessage.addListener(function (message, sender, sendResponse){
    console.log('[MESSAGE] ', message);

  switch(message.todo){
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
      }, function(redirectURL) {
        if (browser.runtime.lastError) {
          alert(browser.runtime.lastError.message);
        }
        if(redirectURL){
          var q = redirectURL.substr(redirectURL.indexOf('#')+1);
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
        return  browser.tabs.create({active: true, url: message.url});
    case 'check_ads':
        let text = message.title+message.url;
        let doBlock = blockKeyWordsRegexp.test(text);

        console.log('[CHECK ADS] doBlock: ', doBlock, text);
        if (doBlock) {
            fetch(SERVER_URL + '/api/v1/app/ping_do_block?url=' + message.url)
        }
        return sendResponse(doBlock);
  }


});

browser.windows.getCurrent({
  populate: true
}, function (window){
  console.log('[GET CURRENT WINDOW] ', window.id);
  old_window_id = window.id;
  new_window_id = window.id;
});

browser.browserAction.getBadgeText({}, function (result){
  // console.log('getBadgeText ', result)
  if(!!result) browser.browserAction.setBadgeText({'text': ''});
});


// browser.contextMenus.create({
//   title: "Mingle Cash",
//   contexts: ["browser_action"],
//   onclick: function() {
//     browser.tabs.create({ url: 'https://minglecash.com/' });
//   }
// });

function checkCookies(){
  browser.cookies.get({url:'https://minglecash.com', name:'sessionid'}, function(cookie) {
    browser.storage.sync.get('cookie', function(budget){
      if(cookie && (budget.cookie != cookie.value)){
        browser.storage.sync.set({
          'cookie': cookie.value
        });
      }
    });
  });

}

if(drop_counter){
  count = 0
}

browser.runtime.onInstalled.addListener((details) => {
    console.log('[INSTALLED]', details);
    isInstall = details.reason === "install";
    if (isInstall){
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

