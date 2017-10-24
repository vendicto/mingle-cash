const EL_SEPARATOR = '##';
console.log('[ADS - INIT]');

const getContainerParams = (el) => {
    return {
        className: el.getAttribute('class'),
        parent: el.parentElement,
        height: el.offsetHeight ||  '250px',
        width: el.offsetWidth
    }
};

const appendChild = (el) => {
    const newEl = document.createElement('iframe');
    const elp = getContainerParams(el);

    newEl.setAttribute('class', `mingle-ad-container`);
    newEl.setAttribute('style', `width:${elp.width}!important; height: ${elp.height}!important;`);
    newEl.type= 'text/javascript';

    browser.runtime.sendMessage({action: 'get_link', width: elp.width, height:elp.height}, src => {
        console.log('[ADS - NEW ELEMENT] ', src);
        newEl.src = src;
        elp.parent.appendChild(newEl)
    })
};


const checkIframeLoaded = (iframe, callback) => {
    console.log('[ADS - CHECK IFRAME]', iframe);

    // Get a handle to the iframe element
    let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Check if loading is complete
    if (  iframeDoc.readyState  == 'complete' ) {
        console.log('[ADS - CHECK IFRAME] - LOADED');
        // The loading is complete, call the function we want executed once the iframe is loaded
        callback(iframe);
        return;
    }

    // If we are here, it is not loaded. Set things up so we check   the status again in 100 milliseconds
    window.setTimeout(() => checkIframeLoaded(iframe, callback), 100);

};

const checkSpecificEls = () => {
    console.log('[ADS - CHECK SPECIFIC ELS]');

    browser.runtime.sendMessage({action: 'get_from_specific_list', domain: document.domain}, match => {
        // console.log('[ADS - CHECK SPECIFIC ELS - LOADED] - ' + new Date() + ' - ' + JSON.stringify(match));

        match && match.forEach(m => {
            let selector = m.split(EL_SEPARATOR)[1];
            return document.querySelectorAll(selector).forEach((el) => {
                console.log('[ADS - CHECK SPECIFIC ELS - FOUND]');
                el.tagName === 'IFRAME' ? checkIframeLoaded(el, appendChild) : appendChild(el);
            });
        });

        checkGeneralEls()
    });
};

const checkGeneralEls = () => {
    console.log('[ADS - CHECK GENERAL ELS]');

    browser.runtime.sendMessage({action: 'get_general_list'}, relist => {
        let match;
        let matches = [];

        for (let re of relist) {
            if (!re || re.startsWith('!')) {
                continue;
            }

            match = document.querySelectorAll(re);

            if (!match.length && re.startsWith('#')) {
                try {
                    match = document.querySelectorAll('[id^="' + re.replace(/^#/, '') + '"]');
                }
                catch (e) {}
            }

            if (match.length) {
                matches = matches.concat(match);
            }
        }

        if (matches.length) {
            for (let m of matches) {
                m.forEach((el) => {
                    // console.log('[GENERAL_EL]', m, el);
                    el.tagName === 'IFRAME' ? checkIframeLoaded(el, appendChild) : appendChild(el);
                })
            }
        }

        console.log('[FINISH] ' + new Date())
    })

};


/**
 * START SCRIPT
 */
setTimeout(checkSpecificEls, 5000);