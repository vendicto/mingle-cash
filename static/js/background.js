
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
  window_id = '',
  drop_counter = false,
  isInstall = false,
  browserActionsClicks = 0;

var fullName = '';


var count = 0;


// fnc for send auth and get key
function sendAuth(type, url, data){
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
          'Authorization' : `Token ${newkey}`
        },
        url: 'https://minglecash.com/api/v1/user/',
        data: data,
        dataType: "json",
        success: function (response) {
          chrome.storage.sync.set({
            'key': newkey,
            'user_id': response.user_id
          }, function () {
            user_id = response.user_id;
            auth_key = newkey;
            fullName = response.first_name + ' ' + response.last_name;
            chrome.browserAction.setIcon({ path: "static/img/icon16.png" });
            chrome.runtime.sendMessage({done: true});
            chrome.extension.getViews({type: "popup"}).forEach(function(win) {
              if(win != window) win.close();
            });
          });
        }
      });
    },
    error: function (err) {
      alert(err.responseText.split(':')[0].replace(/[^\w\s]/gi, '') + ': ' + err.responseText.split(':')[1].replace(/[^\w\s]/gi, ''));
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
  // console.log('getAndSendUrls');
  //clear history and current url
  history_url = [];
  current_url = '';

  // get urls
  chrome.history.search({text: '', maxResults: 20}, function(data) {
    data.forEach(function(page) {
      history_url.push(extractHostname(page.url));
    });
    //get current url
    chrome.tabs.getSelected(null, function(tab) {
      current_url = tab.url;

      let current_time = new Date();
      // console.log('getAndSendUrls auth_key ', auth_key);
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
          // create_ads_tab('https://www.google.com.ua/');
          create_ads_tab(data.max_category);
        }
      });
    });

  });
}

function create_ads_tab(url) {

  chrome.tabs.create({
    url: url,
    active: false
  }, function(tab) {
    chrome.windows.create({
      tabId: tab.id,
      type: 'popup',
      focused: false
      // incognito, top, left, ...
    }, function (window) {
      // console.log('windows.create', window.id);
      // console.log('window_id', window_id);
      if (window.id != window_id) chrome.windows.update(window_id , {focused: true});
    });

    chrome.browserAction.setBadgeText({'text': String(++count)});


  });
}

function createAlarm(){
  if(startAlarmTime){
    startAlarmTime = activeTime = new Date(startAlarmTime);
  } else {
    startAlarmTime = activeTime = new Date();
  }
  // console.log('createAlarm ', startAlarmTime);

  // isFired = false;
  // chrome.alarms.create("myAlarm", {delayInMinutes: 3, periodInMinutes: 3} );
}

function firedAlarm() {
  // console.log('firedAlarm');
  isFired = true;
  chrome.alarms.clear("myAlarm");
}


function checkLogIn(){
  chrome.storage.sync.get('key', function(budget){
    if(budget.key){
      auth_key = budget.key;
      chrome.browserAction.setPopup({popup: 'auth.html'});
      chrome.browserAction.setIcon({ path: "static/img/icon16.png" });
      createAlarm();
    } else {
      chrome.browserAction.setPopup({popup: 'popup.html'});
      // firedAlarm();
    }
  });
}


chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab){
  // console.log('onUpdated windowId', tab.windowId);
  if(tab.windowId == window_id) activeTime = new Date();
  if(startAlarmTime && startAlarmTime.valueOf() + 3*60000 <= activeTime.valueOf()){
    startAlarmTime = activeTime;
    getAndSendUrls();
    createAlarm();
  }
  // if(isFired && auth_key){
  //   createAlarm();
  // }
});

chrome.tabs.onActivated.addListener(function (activeInfo){
  // console.log('onActivated windowId', activeInfo.windowId);
  if(activeInfo.windowId == window_id) activeTime = new Date();
  if(startAlarmTime && startAlarmTime.valueOf() + 3*60000 <= activeTime.valueOf()){
    startAlarmTime = activeTime;
    getAndSendUrls();
    createAlarm();
  }
  // if(isFired && auth_key){
  //   createAlarm();
  // }
});


// chrome.alarms.onAlarm.addListener(function() {
//   // let checkTime = startAlarmTime.valueOf() + 5*60000;
//   // updatedtime = new Date().valueOf();
//   //
//   // console.log('onAlarm checkTime ',   new Date(checkTime) , 'updatedtime ', new Date(updatedtime) );
//   // console.log('onAlarm startAlarmTime ',   startAlarmTime , 'activeTime ', activeTime );
//
//   if(startAlarmTime == activeTime){
//     // firedAlarm();
//   } else {
//     startAlarmTime = activeTime;
//     getAndSendUrls();
//   }
// });


chrome.storage.onChanged.addListener(function (changes, storageName) {
  // console.log('storage onChanged ', changes, storageName);
  checkLogIn();
});

chrome.runtime.onMessage.addListener(function (message){

  switch(message.todo){
    case 'standart_login':
      sendAuth("POST", "https://minglecash.com/api/v1/authenticate/", {
        username: message.username,
        email: message.email,
        password: message.password
      });
      break;
    case 'google_btn':
      chrome.identity.getAuthToken({
        interactive: true
      }, function(token) {
        if (chrome.runtime.lastError) {
          alert(chrome.runtime.lastError.message);
        } else {
          if(token){
            chrome.identity.getProfileUserInfo(function (email, id) {
              // console.log(email, id);
            });
            sendAuth("POST", "https://minglecash.com/api/v1/rest-auth/google/", {
              access_token: token
            });
          }
        }
      });
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
  }


});

chrome.windows.getCurrent({
  populate: true
}, function (window){
  // console.log('getCurrent windowId ', window.id);
  window_id = window.id;
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

if(drop_counter){
  count = 0
}

chrome.runtime.onInstalled.addListener((details) => {
  isInstall = details.reason === "install";
  if(isInstall)
    chrome.storage.sync.clear();
})


checkLogIn();

