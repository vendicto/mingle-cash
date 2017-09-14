document.title = "MingleCash Companion";

const isChrome = (/google/i).test(navigator.vendor);
browser = isChrome ? chrome : browser;

/**
 * Time Left
 */
function msToTime(s) {
    let ms = s % 1000;
    s = (s - ms) / 1000;
    let secs = s % 60;
    s = (s - secs) / 60;
    let mins = s % 60;
    let hrs = (s - mins) / 60;

    return hrs + ':' + mins + ':' + secs;
}

setInterval(() => {
    browser.runtime.sendMessage({action: 'fb_get_time_left'}, (time) => {
        document.querySelector('.mcash-waiting-timer-data').innerText = msToTime(time)
    })
}, 1000);

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a')
            .forEach(el => el.addEventListener('click', (e) => {
                e.preventDefault();
                browser.runtime.sendMessage({action: 'fb_open_link', url: e.target.href})
                return false;
            }));
});