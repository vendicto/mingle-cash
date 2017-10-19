console.log('[CPALEAD] - 37663');

document.addEventListener('DOMContentLoaded', () => {
    console.log('[CPALEAD] - 37663');

    var _cpalead_b64 = {

        _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

        encode: function (input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;

            input = _cpalead_b64._utf8_encode(input);

            while (i < input.length) {

                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

            }

            return output;
        },


        decode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            while (i < input.length) {

                enc1 = this._keyStr.indexOf(input.charAt(i++));
                enc2 = this._keyStr.indexOf(input.charAt(i++));
                enc3 = this._keyStr.indexOf(input.charAt(i++));
                enc4 = this._keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }

            }

            output = _cpalead_b64._utf8_decode(output);

            return output;

        },

        _utf8_encode: function (string) {
            string = string.replace(/\r\n/g, "\n");
            var utftext = "";

            for (var n = 0; n < string.length; n++) {

                var c = string.charCodeAt(n);

                if (c < 128) {
                    utftext += String.fromCharCode(c);
                }
                else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
                else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }

            }

            return utftext;
        },

        _utf8_decode: function (utftext) {
            var string = "";
            var i = 0;
            var c = c1 = c2 = 0;

            while (i < utftext.length) {

                c = utftext.charCodeAt(i);

                if (c < 128) {
                    string += String.fromCharCode(c);
                    i++;
                }
                else if ((c > 191) && (c < 224)) {
                    c2 = utftext.charCodeAt(i + 1);
                    string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                }
                else {
                    c2 = utftext.charCodeAt(i + 1);
                    c3 = utftext.charCodeAt(i + 2);
                    string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }

            }

            return string;
        }
    }

    function getJSONP(url, success) {

        var ud = '_' + +new Date,
            script = document.createElement('script'),
            head = document.getElementsByTagName('head')[0]
                || document.documentElement;

        window[ud] = function (data) {
            head.removeChild(script);
            success && success(data);
        };

        script.src = url.replace('callback=?', 'callback=' + ud);
        head.appendChild(script);

    }

    function getScript(url, success) {
        var script = document.createElement('script');
        script.src = url;
        var head = document.getElementsByTagName('head')[0],
            done = false;
        // Attach handlers for all browsers
        script.onload = script.onreadystatechange = function () {
            if (!done && (!this.readyState
                    || this.readyState == 'loaded'
                    || this.readyState == 'complete')) {
                done = true;
                success();
                script.onload = script.onreadystatechange = null;
                head.removeChild(script);
            }
        };
        head.appendChild(script);
    }

    function createCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + value + expires + "; path=/";
    }

    function readCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function eraseCookie(name) {
        createCookie(name, "", -1);
    }

    function load_push_ad() {


        $('<style>.c-fade{opacity:0;-webkit-transition:opacity .15s linear;-o-transition:opacity .15s linear;transition:opacity .15s linear}.c-modal{position:fixed;top:0;right:0;bottom:0;left:0;z-index:1050;display:none;overflow:hidden;-webkit-overflow-scrolling:touch;outline:0}.c-fade.in{opacity:1}.c-modal-open .c-modal{overflow-x:hidden;overflow-y:auto}.c-modal-dialog{position:relative;width:auto;margin:10px;text-align:center; margin:15% auto;}.c-modal-dialog p{margin:0}.c-modal.c-fade .c-modal-dialog{-webkit-transition:-webkit-transform .3s ease-out;-o-transition:-o-transform .3s ease-out;transition:transform .3s ease-out;-webkit-transform:translate(0,-25%);-ms-transform:translate(0,-25%);-o-transform:translate(0,-25%);transform:translate(0,-25%)}.c-modal.in .c-modal-dialog{-webkit-transform:translate(0,0);-ms-transform:translate(0,0);-o-transform:translate(0,0);transform:translate(0,0)}.c-modal-content{position:relative;background-color:#fff;-webkit-background-clip:padding-box;background-clip:padding-box;border:1px solid #999;border:1px solid rgba(0,0,0,.2);border-radius:6px;outline:0;-webkit-box-shadow:0 3px 9px rgba(0,0,0,.5);box-shadow:0 3px 9px rgba(0,0,0,.5)}.c-modal-body{position:relative;padding:15px}.c-modal-body .row{margin-right:-15px;margin-left:-15px}.c-modal-footer{padding:15px;text-align:center;border-top:1px solid #e5e5e5}.btn{display:inline-block;padding:6px 12px;margin-bottom:0;font-size:14px;font-weight:400;line-height:1.42857143;text-align:center;white-space:nowrap;vertical-align:middle;-ms-touch-action:manipulation;touch-action:manipulation;cursor:pointer;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;background-image:none;border:1px solid transparent;border-radius:4px}.btn-default{width:75px;text-align:center;color:#333;background-color:#fff;border-color:#ccc}.c-modal-backdrop.c-fade {filter: alpha(opacity=0);opacity: 0;}.c-modal-backdrop {position: fixed;top: 0;right: 0;bottom: 0;left: 0;z-index: 1040;background-color: #000;}.c-modal-backdrop.in {filter: alpha(opacity=50);opacity: .5;}@media (min-width: 768px){.c-modal-dialog {width: 400px;}}@media (max-width:767px){.c-modal-dialog {width: 95%; margin: 20% 2.5%;}}.btn.focus,.btn:focus,.btn:hover{color: #333;text-decoration: none;}.btn-default:hover{color: #333;background-color: #e6e6e6;border-color: #adadad;}.c-modal-footer .btn+.btn {margin-bottom: 0;margin-left: 5px;}#push_up_ad small{display:block;}</style><div class="c-modal fade" id="push_up_ad" role="dialog"><div class="c-modal-dialog" role="document"><div class="c-modal-content"><div class="c-modal-body"><p id="push_up_ad_campaign_name"></p><small id="push_up_ad_campaign_desc"></small><small id="push_up_ad_campaign_desc_2"></small></div><div class="c-modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button><a href="#" id="push_up_ad_campaign_url" class="btn btn-default">OK</a></div></div></div></div>').appendTo('body');

        var offer_url = "https://trklvs.com/dashboard/reports/cpc_json_load.php?subid=758166&subid1=&subid2=&subid3=&limit=1&target_geo=user&target_device=user&b_type=pu&b_id=37663&res=" + window.screen.width + "x" + window.screen.height + "&cacheurl=" + encodeURIComponent(_cpalead_b64.encode(document.referrer)) + "&format=JSONP&callback=?";
        getJSONP(offer_url, function (data) {
            if (data.campaigns.length > 0) {

                title = data.campaigns[0].title;
                description = data.campaigns[0].description;
                description_2 = data.campaigns[0].description_2;
                url = data.campaigns[0].tracking_url;

                $('#push_up_ad_campaign_name').html(title);
                $('#push_up_ad_campaign_desc').html(description);
                $('#push_up_ad_campaign_desc_2').html(description_2);
                $('#push_up_ad_campaign_url').attr("href", url);
                $('#push_up_ad').modal('show');

            }
        });
    }


    var load = 0;
    var device_type = '1';
    var timer = parseInt('2') * 1000;

    if (device_type == '0') {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            load = 1;
        }
    } else {
        load = 1;
    }

    if (load == 1) {
        getScript('https://code.jquery.com/jquery-1.11.1.min.js', function () {
            getScript('https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js', function () {
                if (timer > 0) {
                    setTimeout(function () {
                        load_push_ad();
                    }, timer);
                } else {
                    load_push_ad();
                }
            });
        });
    }


});