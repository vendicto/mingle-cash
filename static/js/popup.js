
$(function() {

    $('form').on('submit',function(e){
        e.preventDefault();
        var email = $('.login_email').val();
        var obj = {
            todo: 'standart_login',
            username: email,
            email: email,
            password: $('.login_password').val()
        };
        
        chrome.runtime.sendMessage(obj, function(response){
            // console.log('sendMessage form response ', response);
        });


    });
    $('#google_btn, #fb_btn').click(function(e){
        chrome.runtime.sendMessage({
            todo: e.target.id
        }, function(response){
            console.log('response fb google ', response);
        });

    });
  
    if(background.fullName.length > 1){
      $('#loggedIn').text('Logged in as ' + background.fullName).css('display', 'block');
    }

});


var background = chrome.extension.getBackgroundPage();

// chrome.runtime.onMessage.addListener(function(message) {
//   console.log('test ', message.name);
//   test = message.name;
//   $('.no_logged_in').hide();
//   $('.logged_in').show();
// });

