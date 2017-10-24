
var redirectUri = chrome.identity.getRedirectURL("oauth2");
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

let blockAll = false;
let blockKeyWords = [];
let blockKeyWordsRegexp = [];

const SERVER_URL = 'https://minglecash.com';
// const SERVER_URL = 'http://127.0.0.1:8000';

const PING_INTERVAL = 3 * 60 * 1000;
const ADS_SHOW_TIMEOUT = 3 * 60 * 1000;

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
            chrome.storage.sync.set({
                'key': newkey,
                'user_id': user_id,
                'fullName': fullName
            }, function () {
                auth_key = newkey;
                chrome.browserAction.setIcon({ path: "static/img/icon16.png" });
                chrome.runtime.sendMessage({done: true});
                chrome.extension.getViews({type: "popup"}).forEach(function(win) {
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
  chrome.history.search({text: '', maxResults: 20}, function(data) {
    data.forEach(function(page) {
      history_url.push(extractHostname(page.url));
    });
    console.log('[CATEGORY ADS]', history_url);
      //get current url
    chrome.tabs.getSelected(null, function(tab) {
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
        chrome.webNavigation.onCommitted.removeListener(cb);

        // Allow downloads in popups
        chrome.tabs.executeScript(obj.tabId, { file: "static/js/content/handlers.js" });
        chrome.tabs.executeScript(obj.tabId, { file: "static/js/content/adblock.js" });
    };

    chrome.webNavigation.onCommitted.addListener(cb);

    chrome.windows.getAll(allWindows => {
        let mainWindow = allWindows[0];
        chrome.windows.create({
            // tabId: tab.id,
            url: url,
            focused: false,
            height: mainWindow.height,
            width: mainWindow.width,
            top: mainWindow.top,
            left: mainWindow.left
        }, function (window) {


            chrome.windows.update(old_window_id, {focused: true});
        });

        chrome.browserAction.setBadgeText({'text': String(count)});
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
  chrome.alarms.clear("myAlarm");
}


function checkLogIn(){
  chrome.storage.sync.get(['key', 'cookie', 'fullName'], function(budget){
    console.log('[CHECK LOGIN] budget ', budget);
    if(budget.key){
      // console.log('budget key ', budget.key);
      auth_key = budget.key;
      fullName = budget.fullName;
      chrome.browserAction.setPopup({popup: 'auth.html'});
      chrome.browserAction.setIcon({ path: "static/img/icon16.png" });
      createAlarm();
      loadUserData(auth_key)
    } else if(!budget.key && budget.cookie){
      // console.log('budget cookie ', budget.cookie);
      sendAuth("POST", "https://minglecash.com/api/v1/user-by-session/", {
        sessionid: budget.cookie
      });
    } else {
      console.log('[CHECK LOGIN] - CLEAR');
      chrome.storage.sync.clear();
      chrome.browserAction.setPopup({popup: 'popup.html'});
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

    if (blockAll) {
        chrome.tabs.executeScript(tab ? tab.id : tabId.tabId, { file: "static/js/content/adblock.js" });
    }

    checkCookies();
    activeTime = new Date();
    if(auth_key && (startAlarmTime.valueOf() + ADS_SHOW_TIMEOUT <= activeTime.valueOf())){
        startAlarmTime = activeTime;
        getAndSendUrls();
        createAlarm();
    }
}
chrome.tabs.onUpdated.addListener(onTabChange);
chrome.tabs.onActivated.addListener(onTabChange);


chrome.storage.onChanged.addListener(function (changes, storageName) {
  console.log('[STORAGE CHANGED] budget ', changes, storageName);
  // console.log('storage onChanged ', changes, storageName);
  checkLogIn();
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse){
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
      chrome.identity.launchWebAuthFlow({
        url: AUTH_URL,
        interactive: true
      }, function(redirectURL) {
        if (chrome.runtime.lastError) {
          alert(chrome.runtime.lastError.message);
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
        return  chrome.tabs.create({active: true, url: message.url});
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

chrome.windows.getCurrent({
  populate: true
}, function (window){
  console.log('[GET CURRENT WINDOW] ', window.id);
  old_window_id = window.id;
  new_window_id = window.id;
});

chrome.browserAction.getBadgeText({}, function (result){
  // console.log('getBadgeText ', result)
  if(!!result) chrome.browserAction.setBadgeText({'text': ''});
});


// chrome.contextMenus.create({
//   title: "Mingle Cash",
//   contexts: ["browser_action"],
//   onclick: function() {
//     chrome.tabs.create({ url: 'https://minglecash.com/' });
//   }
// });

function checkCookies(){
  chrome.cookies.get({url:'https://minglecash.com', name:'sessionid'}, function(cookie) {
    chrome.storage.sync.get('cookie', function(budget){
      if(cookie && (budget.cookie != cookie.value)){
        chrome.storage.sync.set({
          'cookie': cookie.value
        });
      }
    });
  });

}

if(drop_counter){
  count = 0
}

chrome.runtime.onInstalled.addListener((details) => {
    console.log('[INSTALLED]', details);
    isInstall = details.reason === "install";
    if (isInstall){
        chrome.storage.sync.clear();
        window.open('https://minglecash.com/extension_installed')
    }
});


/**
 * PING Server each PING_INTERVAL
 */
const ping = () => {
    chrome.storage.sync.get(['key', 'cookie', 'fullName'], budget =>
        chrome.management.getSelf(extension =>
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
                    if (r.block_all) {
                        console.info('[PONG] Block All: ', r.block_all);
                        blockAll = r.block_all
                    }
                })
        )
    )
};

setInterval(ping, PING_INTERVAL);

ping();
checkLogIn();

