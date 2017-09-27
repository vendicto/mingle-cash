var background = chrome.extension.getBackgroundPage();

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
  $('#sawAds').text('You have seen ' + background.count + ' ad(s) today');
});