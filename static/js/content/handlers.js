
const openLink = (url) =>
    url && chrome.runtime.sendMessage({action: 'open_link', url});

document.querySelectorAll('a')
    .forEach(a => a.addEventListener(
        'click',
        e => openLink(e.target.href || e.target.parentElement.href)
    ));