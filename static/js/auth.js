var background = chrome.extension.getBackgroundPage();

console.log('[AUTH]');
$(function() {
  background.browserActionsClicks++
  console.log(background.browserActionsClicks)
  if(background.isInstall && background.browserActionsClicks <= 1){
    $('.greatText').text('Great!');
    $('.otherText').text('You\'ve just started using MingleCash');
    $('.support_box').css('margin-top', 20);
  } else {
    $('.greatText').text('');
    $('.otherText').text('');
    $('.support_box').css('margin-top', 0);
  }
  $('#sawAds').text('Pop-unders seen today: ' + background.count);

  let features = background.pluginFeatures;

  if (features['adcash'] && features['adcash']['limit_exceeded']) {
      $('#sawAds').append('<p style="color:red">Daily limit of pop-unders exceeded!</p>')
  }

  if(features.videos) {
      console.log('[VIDEO]');
      $('#videoLoyalty').show();
      $('#videoLoyaltyCounter').show().text('Video offers made today: ' + background.pluginFeatures.videos.seen_today);
  }
});