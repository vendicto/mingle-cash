const isChrome = (/google/i).test(navigator.vendor);
browser = isChrome ? chrome : browser;

const small = [1802819,1802827,1802831,1802839,1802847,1802855,1802863,1802871,1802887,1802903,1802911,1802919,1802927,1802935,1802959,1802967,1802971,1802979,1802991,1802999,1803007,1803015,1803023,1803031,1803039,1803047]
const large = [1802815,1802823,1802835,1802843,1802847,1802859,1802867,1802875,1802899,1802907,1802915,1802923,1802931,1802943,1802963,1802971,1802987,1802983,1802995,1803003,1803011,1803019,1803027,1803035,1803043,1803051]

let generalList = [];
let specificList = '';

console.log('[START] ' + new Date());

fetch(browser.extension.getURL('static/adv/rules/easylist_general_hide.txt'))
    .then(r => r.text())
    .then(r => {
        console.log('[ADS - GENERAL LIST] ' + new Date());
        generalList = r.split('\n')
    });


fetch(browser.extension.getURL('static/adv/rules/easylist_specific_hide.txt'))
    .then(r => r.text())
    .then(r => {
        console.log('[ADS - SPECIFIC LIST] ' + new Date());
        specificList = r
    });


const buildLink = (width) => {
    const arr = Number(width) > 720 ? large : small;

    return 'https://www.onclickmax.com/a/display.php?r=' + arr[Math.floor(Math.random() * arr.length)];
};


chrome.runtime.onMessage.addListener(function (message, sender, sendResponse){
    console.log('[MESSAGE] ', message);

    switch(message.action){
        case 'get_general_list':
            return sendResponse(generalList);
        case 'get_from_specific_list':
            const re = new RegExp('\n' + message.domain + '.*$', 'gm');
            return sendResponse(specificList.match(re));
        case 'get_link':
            fetch(buildLink(message.width))
                .then(r => r.text())
                .then(r => {
                    let url = r.match(/"(https:.+)"\)/)[1];
                    console.log('[GET LINK - URL]', url);
                    sendResponse(url)
                });
            return true;
    }

});
