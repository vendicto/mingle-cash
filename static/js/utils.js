const isChrome = (/google/i).test(navigator.vendor);
const browser = isChrome ? chrome : browser;

const Log = function() {
    if (pluginFeatures['debug']) {
        console.log.apply(this, arguments)
    }
};

function isBrowserFocused(cb) {
    browser.windows.getAll(windows => {
        let isFocused = windows.filter(w => w.focused).length;
        cb(isFocused)
    })
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

