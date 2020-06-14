let drawIt = {};

(() => {
    'use strict';

    drawIt.pageContentClass = class PageContent {
        constructor() {
            this.data = {};
            drawIt.stopProgressbar();
            drawIt.setProgressbar(90);
            drawIt.content = this;
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
            drawIt.loadContent();
        }

    };



    $(document).ready(() => {
        let socket = io();

        $.ajaxSetup({
            cache: false
        });


        socket.on('disconnect', function () {
            if(drawIt.content instanceof drawIt.pageContentClass){
                drawIt.content.reset();
            }
            let content = $("#content");
            content.empty();
            content.html("" +
                "<div class=\"ui placeholder segment\" style=\"height: 100%\">\n" +
                "    <div class=\"ui centered vertical\">\n" +
                "        <p>" +
                "        Un problème avec le serveur est survenu :(<br />\n" +
                "        Merci de contacter l'administrateur : nicolas@guerroudj.fr\n" +
                "        </p>" +
                "   </div>\n" +
                "</div>\n")
        });

        drawIt.progressbar = $("#load_progress");

        drawIt.progressbar.progress({
            total: 100
        });

        drawIt.stopProgressbar = () => {
            clearInterval(drawIt.progressbar.fakeProgress)
        };

        drawIt.resetProgressbar = () => {
            drawIt.progressbar.progress('reset');
        }

        drawIt.setProgressbar = (percent) => {
            drawIt.progressbar.progress({
                percent: percent
            });
        }

        drawIt.startProgressbar = (to = 100) => {
            drawIt.progressbar.fakeProgress = setInterval(() => {
                drawIt.progressbar.progress('increment');
                if(drawIt.progressbar.progress('is complete') || drawIt.progressbar.progress('get value') >= to) {
                    drawIt.progressbar.progress('remove success')
                    drawIt.stopProgressbar();
                }
            }, 10);
        }

        drawIt.loadContent = () => {
            drawIt.resetProgressbar();
            drawIt.startProgressbar(80);
            $("#loader").show();
            socket.emit('load', {path: window.location.pathname});
        };

        drawIt.loadContent();

        socket.on('load', (data) => {
            if(data && data.url && data.script && data.data){
                $("#content").attr("w3-include-html", data.url);
                if(drawIt.content instanceof drawIt.pageContentClass){
                    drawIt.content.reset();
                }
                $.getScript(data.script, () => {
                    includeHTML(() => {
                        $("#content").empty();
                    }, () => {
                        if(drawIt.content instanceof drawIt.pageContentClass){
                            drawIt.content.setData(data.data)
                            drawIt.content.init();
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

    /**
     * Source:
     * https://www.w3schools.com/howto/howto_html_include.asp
     * Modified by Nicolas GUERROUDJ
     */
    function includeHTML(before = undefined, after = undefined) {
        let z, i, elmnt, file, xhttp;
        z = document.getElementsByTagName("*");
        for (i = 0; i < z.length; i++) {
            elmnt = z[i];
            file = elmnt.getAttribute("w3-include-html");
            if (file) {
                xhttp = new XMLHttpRequest();
                xhttp.onreadystatechange = function() {
                    if (this.readyState == 4) {
                        if(before !== undefined)
                            before();
                        if (this.status == 200) {elmnt.innerHTML = this.responseText;}
                        if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
                        elmnt.removeAttribute("w3-include-html");
                        if(after !== undefined)
                            after();
                    }
                }
                xhttp.open("GET", file, true);
                xhttp.send();
                return;
            }
        }
    };

})();