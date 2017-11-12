console.log('[VIDEO]');

let isChrome = (/google/i).test(navigator.vendor);
let browser = isChrome ? chrome : browser;

browser.runtime.onMessage.addListener( (message, sender, sendResponse) => {

    switch (message.action) {
        case 'video_change_channel':
            let channels = document.querySelector('select.form-control#channel');

            if (channels) {
                let options = channels.querySelectorAll('option');
                let index = (Math.random() * options.length).toFixed(0);
                let option = options[index] || options[0];

                console.log('[VIDEO]', document.location, option);
                option.selected = true;
                document.querySelector('#channels').submit()
            }
    }

});