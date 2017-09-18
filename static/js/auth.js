var background = chrome.extension.getBackgroundPage();

$(function() {
  background.browserActionsClicks++
  if(background.isInstall && background.browserActionsClicks <= 1){
    $('.greatText').text('Great!');
    $('.otherText').text('You\'ve just started using MingleCash');
    $('.support_box').css('margin-top', 20);
  } else {
    $('.greatText').text('');
    $('.otherText').text('');
    $('.support_box').css('margin-top', 0);
  }
});