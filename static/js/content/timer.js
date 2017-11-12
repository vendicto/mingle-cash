console.log('[TIMER]');

(function () {
    const isChrome = (/google/i).test(navigator.vendor);
    const browser = isChrome ? chrome : browser;


    const MC_TIMER_STYLE = 'position: fixed; top: 0; width: 100%; z-index: 99999; text-align: center';
    const MC_TIMER_TEMPL = `
            <div style="background: {{mc_color}};padding: 20px;">
                <div style="font-size: 20px;color: white;">{{mc_time}}</div>
            </div>`;

    let time_spent_on_page = 0;

    let body = document.querySelector('body');
    let timer = document.createElement('div');
    timer.setAttribute('style', MC_TIMER_STYLE);
    body.appendChild(timer);

    renderTemplate = (text, color) => {
        let tpl = MC_TIMER_TEMPL.replace('{{mc_time}}', text);
        tpl = tpl.replace('{{mc_color}}', color);
        timer.innerHTML = tpl
    };

    setInterval(() =>
        browser.runtime.sendMessage({todo: 'timer_ping', title: document.title, url: document.location.href}, info => {
            console.log('[Timer] selected', info.tabSelected);

            if (info.tabSelected) {
                time_spent_on_page += 1;

                if (time_spent_on_page > info.minTimeOnPage) {
                    return renderTemplate('Now you can close this window!', '#5cb85c')
                }

                renderTemplate(`You have to spend ${info.minTimeOnPage - time_spent_on_page + 1} seconds on this page.`, '#026eab')
            }

        }), 1000)
})();
