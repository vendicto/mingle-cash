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

  if(background.pluginFeatures.videos) {
      console.log('[VIDEO]');
      $('#videoLoyalty').show();
      $('#videoLoyaltyCounter').show().text('Video offers made today: ' + background.pluginFeatures.videos.seen_today);
  }
});