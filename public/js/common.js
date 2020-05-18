
function includeHTML(before = undefined, after= undefined) {
    var z, i, elmnt, file, xhttp;
    /*loop through a collection of all HTML elements:*/
    z = document.getElementsByTagName("*");
    for (i = 0; i < z.length; i++) {
        elmnt = z[i];
        /*search for elements with a certain atrribute:*/
        file = elmnt.getAttribute("w3-include-html");
        if (file) {
            /*make an HTTP request using the attribute value as the file name:*/
            xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4) {
                    if(before !== undefined)
                        before();
                    if (this.status == 200) {elmnt.innerHTML = this.responseText;}
                    if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
                    /*remove the attribute, and call this function once more:*/
                    elmnt.removeAttribute("w3-include-html");
                    if(after !== undefined)
                        after();
                }
            }
            xhttp.open("GET", file, true);
            xhttp.send();
            /*exit the function:*/
            return;
        }
    }
};

class PageContent {
    constructor() {
        this.data = {};
        $.stopProgressbar();
        $.setProgressbar(90);
        $.content = this;
    }

    setData(data){
        this.data = data;
    }

    init() {
        $("#loader").hide();
        document.title = this.getTitle();
    }

    getTitle(){
        return "Draw It";
    }

    reset() {
        throw new Error('You must implement this function');
    }

    goto(url) {
        history.pushState(null, '', url);
        $.loadContent();
    }

};

$(document).ready(() => {
    let socket = io();

    $.ajaxSetup({
        cache: false//true
    });

    $.progressbar = $("#load_progress");

    $.progressbar.progress({
        total: 100
    });

    $.stopProgressbar = () => {
        clearInterval($.progressbar.fakeProgress)
    }

    $.resetProgressbar = () => {
        $.progressbar.progress('reset');
    }

    $.setProgressbar = (percent) => {
        $.progressbar.progress({
            percent: percent
        });
    }

    $.startProgressbar = (to = 100) => {
        $.progressbar.fakeProgress = setInterval(function() {
            $.progressbar.progress('increment');
            if($.progressbar.progress('is complete') || $.progressbar.progress('get value') >= to) {
                $.progressbar.progress('remove success')
                $.stopProgressbar();
            }
        }, 10);
    }

    $.loadContent = () => {
        $.resetProgressbar();
        $.startProgressbar(80);
        $("#loader").show();
        socket.emit('load', {path: window.location.pathname});
    };

    $.loadContent();

    socket.on('load', (data) => {
        if(data && data.url && data.script && data.data){
            $("#content").attr("w3-include-html", data.url);
            if($.content instanceof PageContent){
                $.content.reset();
            }
            $.getScript(data.script, () => {
                includeHTML(() => {
                    $("#content").empty();
                }, () => {
                    if($.content instanceof PageContent){
                        $.content.setData(data.data)
                        $.content.init();
                    }
                });
            });
        }
    });

    $("#create-button").on('click', () => {
        socket.emit('try create', {channelName: $("#create-input").val()});
    });

    socket.on('try create', (data) => {
        if(data.code === 200){
            $(location).attr("href", "/play/"+data.channelName+"/");
        } else {
            $('#error-message .header').text(data.message);
            $('#error-message .sub').text(data.submessage);
            $('#error-message').show()
        }
    });
});
