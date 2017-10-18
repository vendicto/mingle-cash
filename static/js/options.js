console.log('[OPTIONS - INIT]');

$(function () {
    $('#logout_btn').click(function () {
        logOut();
    });
});

function logOut(){
    console.log('[OPTIONS - LOGOUT]');

    chrome.storage.sync.clear();
    isCoockies = false;
    $.ajax({
        type: "POST",
        url: "https://minglecash.com/api/v1/rest-auth/logout/",
        dataType: "json",
        success: function (data) {
            console.log(data);
        }
    });
    remove_token();
    firedAlarm();
}
function remove_token() {
    console.log('[OPTIONS - remove_token]');

    chrome.identity.getAuthToken({ 'interactive': false },
        function(current_token) {
            // console.log('current_token ', current_token);
            if (!chrome.runtime.lastError) {

                // @corecode_begin removeAndRevokeAuthToken
                // @corecode_begin removeCachedAuthToken
                // Remove the local cached token
                chrome.identity.removeCachedAuthToken({ token: current_token },
                    function(data) {
                        // console.log('removeCachedAuthToken data', data);
                    });
                // @corecode_end removeCachedAuthToken

                // Make a request to revoke token in the server
                var xhr = new XMLHttpRequest();
                xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
                    current_token);
                xhr.send();
                // @corecode_end removeAndRevokeAuthToken
                xhr.onload = function (data) {
                    // console.log('data ', data);
                    // console.log('this ', this);
                };
                // Update the user interface accordingly
                // console.log('Token revoked and removed from cache. '+
                //     'Check chrome://identity-internals to confirm.');
            }
        });
}
// callback = function (error, httpStatus, responseText);
function authenticatedXhr(method, url, callback) {
    console.log('[OPTIONS - authenticatedXhr]');

    var retry = true;
    function getTokenAndXhr() {
        chrome.identity.getAuthToken({interactive: true},
            function (access_token) {
                if (chrome.runtime.lastError) {
                    callback(chrome.runtime.lastError);
                    return;
                }

                var xhr = new XMLHttpRequest();
                xhr.open(method, url);
                xhr.setRequestHeader('Authorization',
                    'Bearer ' + access_token);

                xhr.onload = function () {
                    if (this.status === 401 && retry) {
                        // This status may indicate that the cached
                        // access token was invalid. Retry once with
                        // a fresh token.
                        retry = false;
                        chrome.identity.removeCachedAuthToken(
                            { 'token': access_token },
                            getTokenAndXhr);
                        return;
                    }

                    callback(null, this.status, this.responseText);
                }
            });
    }
}
