const isChrome = (/google/i).test(navigator.vendor);
browser = isChrome ? chrome : browser;

const getURL = browser.extension.getURL;

let LOGO_URL = getURL('/icons/logo.jpeg');
let LS_HIDDEN_USERS_KEY = 'LS_HIDDEN_USERS_KEY';

let MCash = document.MCash = {

    lastSearchValue: '',

    i18n: '',

    loadi18n: () => {
        fetch(getURL('popup/i18n.json'))
            .then(r => r.json())
            .then(r => MCash.i18n = r);
    },

    insertHTML: function (html, root, el) {
        if (el) {
            const div = document.createElement(el);
            div.innerHTML = html;
            root.appendChild(div);
        } else {
            root.innerHTML = html
        }
    },

    insertScript: function (src, callback) {
        const s = document.createElement('script');
        s.setAttribute('src', getURL(src));
        s.setAttribute('type', 'text/javascript');
        s.setAttribute('defer', 'true');
        document.head.appendChild(s);
    },

    insertStyle: function (src) {
        const s = document.createElement('link');
        s.setAttribute('rel', 'stylesheet');
        s.setAttribute('href', getURL(src));
        document.head.appendChild(s);
    },

    select: function (selector) {
        return document.querySelector(selector)
    },

    id: function (elementId) {
        return document.getElementById(elementId)
    },

    /**
     * Show loader on script rendered
     */
    showLoader: () => {
        browser.runtime.sendMessage({action: 'fb_show_loader'})
    },

    /**
     * Hide loader on script rendered
     */
    hideLoader: () => {
        browser.runtime.sendMessage({action: 'fb_hide_loader'})
    },

    /**
     * Open link with provided URL
     */
    openLink: (url) => {
        browser.runtime.sendMessage({action: 'fb_open_link', url})
    },

    /**
     * User logged in using MCash credentials
     */
    getMCashLogin: (callback) => {
        browser.runtime.sendMessage({action: 'mc_get_username'}, callback);
    },

    /**
     * Btw User logged in or not
     */
    isLoggedToFB: () => {
        return !!document.querySelector('#pagelet_group_rhc')
    },

    /**
     * User logged in using MCash credentials
     */
    isAuthKeyExist: (callback) => {
        browser.runtime.sendMessage({action: 'mc_auth_key_exist'}, callback);
    },

    /**
     * User logged in using MCash credentials
     */
    isSubmittedFBLogin: (submitted, callback) => {
        browser.runtime.sendMessage({action: 'mc_submitted_fb_login', submitted}, callback);
    },

    /**
     * check invites count
     */
    getInvitesLeft: function () {
        browser.runtime.sendMessage({action: 'fb_get_invites_left'})
    },

    /**
     * Do Login into FB API for background server js
     */
    doFBKeyLogin: () => {
        browser.runtime.sendMessage({ action: 'fb_btn' });
    },

    /**
     * Do Login into FB account
     */
    onFBLogin: () => {
        MCash.isLoggedToFB()
            ? renderIviteFriends()
            : renderFBLogin()
    },

    /**
     * Do Login into FB account
     */
    doFBLogin: () => {
        MCash.isSubmittedFBLogin(true, submitted => {
            let mcashEmail = MCash.select('#mcash-email');
            let mcashPass = MCash.select('#mcash-pass');
            MCash.select('#email').value = mcashEmail.value;
            MCash.select('#pass').value = mcashPass.value;
            MCash.select('#loginbutton').click();

            MCash.showLoader();
        })
    },

    /**
     * Do Login into MC account
     */
    doMCLogin: () => {
        let onMCLoggedIn = response => {
            browser.runtime.onMessage.removeListener(onMCLoggedIn);

            if (response.error) {
                MCash.hideLoader();
                return document.querySelector('.mcash-error-placeholder').innerText = response.error;
            }
            runApp();
        };

        browser.runtime.onMessage.addListener(onMCLoggedIn);
        browser.runtime.sendMessage({
            action: 'standart_login',
            email: MCash.select('#mcash-email').value,
            username: MCash.select('#mcash-email').value,
            password: MCash.select('#mcash-pass').value
        });

        MCash.showLoader();
    },

    /**
     * Find friends using FB interface
     */
    findFriend: function () {
        MCash.select('#group_rhc_see_more_link') && MCash.select('#group_rhc_see_more_link').click();

        let mcashFriendSearch = MCash.select('#mcash-find');
        let search = document.querySelector('form[action="/ajax/groups/members/add_post.php"] input[name="freeform"]');
        console.log(search.value)
        console.log(mcashFriendSearch.value)

        search.value = mcashFriendSearch.value;
        search.dispatchEvent(new Event('focus'));
        search.dispatchEvent(new Event('change'));

        setTimeout(() => {
            let tpl = '';
            let hiddenUsers = MCash.getHiddenUsers();

            document.querySelectorAll('.uiTypeaheadView.uiContextualTypeaheadView li').forEach((i) => {
                if (i.classList.contains('member') || i.classList.contains('user')) {
                    let name = i.getAttribute('title');
                    let img = i.querySelector('img');

                    if (hiddenUsers.indexOf(name) < 0) {
                        tpl += getIviteFriendTpl(name, img.outerHTML, img.src, i.classList.contains('member'))
                    }
                }
            });

            let suggested = !search.value && MCash.getFromSuggest();
            let defaultText = MCash.getDefaultText(hiddenUsers, mcashFriendSearch.value);

            MCash.select('#friends-root').innerHTML = tpl || suggested || defaultText;

            document.querySelectorAll('.mcash-btn-hide').forEach(e => e.addEventListener('click', MCash.onHideClick));
            document.querySelectorAll('.mcash-btn-add').forEach(e => e.addEventListener('click', MCash.onAddClick));
            MCash.select('#mcash-hidden-friends') && MCash.select('#mcash-hidden-friends').addEventListener('click', MCash.onUnhideClick);
        }, 400)
    },


    getDefaultText(hiddenUsers, searchValue) {
        if (!hiddenUsers.length && !searchValue) {
            return '<div>Seems all your friends are members of MingleCash!<br/><br/> Find more friends, get more achievements!</div><br/>'
        }

        let text = searchValue ? '<div style="text-align: center">Nothing found...</div>' : '';

        if (hiddenUsers.length) {
            text += `<div class="has-text-centered">
                       <br/> 
                       To show all your friends that you have hidden, click on the SHOW button.
                       <br/> 
                       <nav class="mcash-show-hidden">
                            <a id="mcash-hidden-friends" class="button is-info is-small">Show</a>
                       </nav>
                   </div>`;
        }

        return text;
    },

    /**
     * Get users from the list of suggested users
     * @return {string}
     */
    getFromSuggest: function () {
        let tpl = '';
        let ul = MCash.select('#groupsNewMembersLink ul.uiList');
        let hiddenUsers = MCash.getHiddenUsers();

        if (ul) {
            for (let u = 0; u < 5; u++) {
                let user = ul.children[u];
                let img = user && user.querySelector('img');
                if (img) {
                    let name = img.getAttribute('aria-label');
                    if (hiddenUsers.indexOf(name) < 0) {
                        tpl += getIviteFriendTpl(name, img.outerHTML, img.src)
                    }
                }
            }
        }
        return tpl;
    },

    /**
     * List of friends that were hidden by user clicked on "hide" button
     * @return {Array} list of hidden users
     */
    getHiddenUsers: function () {
        console.log('[Hidden]');
        return JSON.parse(localStorage.getItem(LS_HIDDEN_USERS_KEY) || '[]');
    },

    /**
     * Users not to show more
     */
    onHideClick: function (e) {
        const users = MCash.getHiddenUsers();
        const user = e.target.getAttribute('name');

        localStorage.setItem(LS_HIDDEN_USERS_KEY, JSON.stringify(users.concat([user])))
        MCash.findFriend();
    },

    /**
     * Show all hidden Users back
     */
    onUnhideClick: (e) => {
        localStorage.setItem(LS_HIDDEN_USERS_KEY, '[]');
        MCash.findFriend();
    },

    onAddClick: function (e) {
        let name = e.target.getAttribute('name');
        let image = e.target.getAttribute('image_src');
        let text = MCash.i18n[navigator.languages[0].split('-')[0]];      // MDN navigator.languages

        renderInviteTemplate(name, image, text.replace(/\{\{name\}\}/g, name.split(' ')[0]).replace(/\{\{myname\}\}/g, MCash.getMyName()))
    },

    onInviteTextChange: function (e) {
        MCash.select('#groups_invite_rhc').value = e.target.value;
    },

    onInviteBtnClick: function (e) {
        let imgsrc = e.target.getAttribute('imgsrc');
        let userName = e.target.getAttribute('userName');
        let targetNode = document.querySelector(`img[src="${imgsrc}"]`);
        let suggestedButton = targetNode.parentElement.querySelectorAll('button')[1];
        let suggestedButtonUserLink = targetNode.parentElement.querySelectorAll('a')[0];

        targetNode = suggestedButton || targetNode;
        console.log(targetNode);

        let data = {id: document.querySelector('[data-click="profile_icon"] a').href.match(/id=(.+)/)[1]};
        if (suggestedButton) {
            data = {
                id: suggestedButtonUserLink.getAttribute('data-hovercard').match(/id=(\d+)/)[1]
            }
        }

        MCash.sendInvite(data, () => {
            MCash.click(targetNode);

            setTimeout(() => {
                renderIviteFriends();
                MCash.getInvitesLeft();
            }, 1500)
        });
    },

    click: (targetNode) => {
        let tr = MCash.triggerMouseEvent;

        tr(targetNode, "mouseover");
        tr(targetNode, "mousedown");
        tr(targetNode, "mouseup");
        tr(targetNode, "click");
    },

    triggerMouseEvent: function (node, eventType) {
        let clickEvent = document.createEvent('MouseEvents');
        clickEvent.initEvent(eventType, true, true);
        node.dispatchEvent(clickEvent);
    },

    sendInvite: function (data, callback) {
        browser.runtime.sendMessage({
            action: 'fb_send_invite',
            data: data
        }, callback)
    },

    getInvitesLeftTemplate: (count) => {
        return `You have ${count} invite${count > 1 ? 's' : ''} left.`;
    },

    onLangChange: (e) => {
        let name = document.querySelector('#mcash-invite-form-name').innerText;
        let lang = e.target.value;
        let text = MCash.i18n[lang.toLowerCase() || 'en'];      // MDN navigator.languages

        document.querySelector('#mcash-text-invite').value = text.replace(/\{\{name\}\}/g, name.split(' ')[0]).replace(/\{\{myname\}\}/g, MCash.getMyName());
    },

    getMyName: () => {
        return document.querySelector('[data-click="profile_icon"] span').innerText;
    },

    onLinkClick: (e) => {
        if (e.target.href) {
            e.preventDefault();
            MCash.openLink(e.target.href);
        }
    }
};


MCash.insertHTML(`<div id="app-root"></div>`, document.body, 'div');
MCash.insertStyle('/popup/css/font-awesome.min.css');
MCash.insertStyle('/popup/css/bulma.min.css');
MCash.insertStyle('/popup/css/main.css');
MCash.insertScript('/popup/js/handlebars.min.js');
MCash.loadi18n();

/**
 * @param tpl
 * @param params
 * @return {Promise.<String>} hbs template
 */
let doRender = (tpl, params) => {
    return fetch(getURL(tpl))
        .then(r => r.text())
        .then(r => {
            tpl = Handlebars.compile(r);
            return Promise.resolve(tpl(params || {}))
        })
};

let doDefaultActions = () => {
    document.title = "MingleCash Companion";
    document.querySelectorAll('a').forEach(el => el.addEventListener('click', MCash.onLinkClick));
    MCash.hideLoader();
};

let renderInviteTemplate = function (name, imgsrc, text) {

    doRender('/popup/templates/invite.hbs', {name, imgsrc, text, logo: LOGO_URL}).then((tpl) => {
        MCash.insertHTML(tpl, document.getElementById('app-root'));
        document.querySelector('#mcash-btn-invite').addEventListener('click', MCash.onInviteBtnClick);
        document.querySelector('#mcash-text-invite').addEventListener('keyup', MCash.onInviteTextChange);
        document.querySelector('#mcash-btn-invite-close').addEventListener('click', renderIviteFriends);
        document.querySelector('#mcash-lang-select').addEventListener('change', MCash.onLangChange);
        doDefaultActions();
    });

};


let getIviteFriendTpl = function (name, img, imgSrc, isMember) {
    return `<div class="box">
                <article class="media">
                    <div class="media-left">
                        <figure class="image is-64x64">
                            ${img}
                        </figure>
                    </div>
                    <div class="media-content">
                        <div class="content">
                            <p>
                                <strong>${name}</strong>
                            </p>
                        </div>` +

        (isMember
            ? `<div class="font-12">Already is a Member</div>`
            : `<nav class="profile-nav">
                                   <a class="button is-small mcash-btn-hide" name="${name}">Hide</a>
                                   <a class="button is-info is-small mcash-btn-add" name="${name}" image_src="${imgSrc}">Add</a>
                               </nav>`) +

        `</div>
                </article>
                
            </div>`;
};


// 1st page
let renderIndex = function (MCLogin) {
    doRender('/popup/templates/index.hbs', {logo: LOGO_URL, fbLogo: getURL('/icons/fb.png'), MCLogin: MCLogin})
        .then(tpl => {
            MCash.insertHTML(tpl, document.getElementById('app-root'));
            MCash.select('#mcash-btn-login-with-fb').addEventListener('click', () => MCash.onFBLogin());
            !MCLogin && MCash.select('#mcash-btn-login-with-mc').addEventListener('click', () => MCash.doMCLogin());
            doDefaultActions();
        });
};

// 2nd page
let renderFBLogin = function () {
    doRender('/popup/templates/fblogin.hbs', {logo: LOGO_URL})
        .then(tpl => {
            MCash.insertHTML(tpl, document.getElementById('app-root'));
            document.querySelector('#mcash-login-form-btn').addEventListener('click', () => MCash.doFBLogin());
            doDefaultActions();
        });
};

// invite && search page
let renderIviteFriends = function () {
    // Do API Login if key not exist
    MCash.isAuthKeyExist( mcAuthkeyExit => !mcAuthkeyExit && MCash.doFBKeyLogin() );

    MCash.hideLoader();
    doRender('/popup/templates/search.hbs', {logo: LOGO_URL})
        .then(tpl => {
            MCash.insertHTML(tpl, document.getElementById('app-root'));
            MCash.findFriend();
            MCash.select('#mcash-find').addEventListener('keydown', () => MCash.findFriend());
            MCash.getInvitesLeft();
            doDefaultActions();
        });

};

/**
 * backend response
 */
browser.runtime.onMessage.addListener(response => {
    console.log('[onMessage] ' + response)
    switch(response.action){
        case 'fb_get_invites_left':
            return MCash.select('#mcash-invites-left') && (
                MCash.select('#mcash-invites-left').innerText = response.error ? response.error : MCash.getInvitesLeftTemplate(response.invites_left));
        case 'fb_send_invite':
            return response.error &&
                MCash.select('#mcash-invites-left') && (
                    MCash.select('#mcash-invites-left').innerText = response.error)
    }
});

/**
 * Control Login strategy
 */
let runApp = () => {
    MCash.getMCashLogin(mcashLogin => {
        MCash.isAuthKeyExist( mcAuthKeyExist => {
            MCash.isSubmittedFBLogin(false, submittedFBLogin => {

                console.log('[OPEN STATUS]: mcashLogin, mcAuthKeyExist, submittedFBLogin', mcashLogin, mcAuthKeyExist, submittedFBLogin);

                if (MCash.isLoggedToFB()) {
                    if (!mcAuthKeyExist && !submittedFBLogin) {
                        renderIndex()
                    } else if (!submittedFBLogin) {
                        renderIndex(mcashLogin)
                    } else {
                        renderIviteFriends()
                    }
                } else if (mcashLogin) {
                    renderIndex(mcashLogin)
                } else {
                    renderIndex()
                }
            })
        })
    })
};

runApp();
document.title = "MingleCash Companion";