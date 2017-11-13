var background = chrome.extension.getBackgroundPage();
$(function() {
    console.log('[POPUP - INIT]');

    $('form').on('submit',function(e){
        console.log('[POPUP - SUBMIT]');

        e.preventDefault();
        var email = $('.login_email').val();
        var obj = {
            todo: 'standart_login',
            username: email,
            email: email,
            password: $('.login_password').val()
        };
        
        chrome.runtime.sendMessage(obj);


    });
    $('#google_btn, #fb_btn').click(function(e){
        console.log('[POPUP - G+/FB]');

        chrome.runtime.sendMessage({
            todo: e.target.id
        }, function(response){
            console.log('response fb google ', response);
        });

    });
  
    if (background.fullName.length > 1) {
      $('#loggedIn').text('Logged in as ' + background.fullName).css('display', 'block');

      $('.user-info').html(`
            <div class="col s12 m6">
                <div class="card user-info-body z-depth-1">
                    <div class="col s2 mc-user-avatar"></div>
                    <div class="col s10 mc-user-name">
                      <span></span>
                    </div>
                </div>
            </div>
      `);

      $('.mc-user-avatar').html(
          background.avatar_url
              ? `<img src="${background.avatar_url}" alt="" class="circle medium responsive-img">`
              : `<i class="material-icons circle medium">account_circle</i>`
      );

      $('.mc-user-name span').text(background.fullName);
    }

    $('#userIsConfirmed').css('display', background.userIsConfirmed ? 'none' : 'block');

    console.log('[POPUP - INITIALIZED]');
});


