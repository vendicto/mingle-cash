var background = chrome.extension.getBackgroundPage();

console.log('[AUTH]');
$(function () {
    background.browserActionsClicks++
    console.log(background.browserActionsClicks)

    let features = background.pluginFeatures;
    let popup = $('#sawAds');

    if (background.isInstall && background.browserActionsClicks <= 1) {
        $('.greatText').text('Great!');
        $('.otherText').text('You\'ve just started using MingleCash');
        $('.support_box').css('margin-top', 20);
    } else {
        $('.greatText').text('');
        $('.otherText').text('');
        $('.support_box').css('margin-top', 0);
    }

    function getViewsTemplate(icon, text, value) {
        return `<div class="row">
            <div class="col s12 m6">
                <div class="card">
                        <div class="mc-view-count">
                            <div class="icon-container">
                                <i class="material-icons">${icon}</i>                        
                            </div>
                                <span>${text}</span>
                                <span class="card-title">${value}</span>
                        </div>
                </div>
            </div>
        </div>`
    }

    /**
     * reset container
     */
    popup.html();

    if (background.adcashActiveTabs && background.adcashActiveTabs.length > features['adcash']['max_windows']) {
        popup.append(`
            <div class="row">
                <div class="col s12 m6">
                  <div class="card red accent-2">
                    <div class="card-content white-text">
                      <span class="card-title">Too many windows open!</span>
                      <p>
                        You have ${features['adcash']['max_windows']} pop-under ads open so we can not show you more ads until you view each of them for at least 3 seconds 
                        and then close them (unless of course if you are interested in the ad and you want to click through to the website of the advertiser).</p>
                    </div>
                  </div>
                </div>
              </div>`
        )
    }

    if (features['adcash'] && features['adcash']['limit_exceeded']) {
        popup.append(`
            <div class="row">
                <div class="col s12 m6">
                  <div class="card green accent-4">
                    <div class="card-content white-text">
                      <span class="card-title">Congrats!</span>
                      <p>
                        You have seen ${features['adcash']['max_view_per_day']} pop-under ads today. No more pop-under ads will display until 12:00am UTC time.</p>
                    </div>
                  </div>
                </div>
              </div>`
        )
    }

    popup.append(
        getViewsTemplate('remove_red_eye', 'Pop-unders <br/> seen today', features['adcash'] ? features['adcash']['seen_today'] : 0)
    );

});