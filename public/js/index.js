drawIt.contentClass = class IndexPage extends drawIt.pageContentClass{

    init() {
        super.init();
        this.socket = io('/index');

        this.socket.on('try create', (data) => {

            if(data.code === 200){
                this.goto("/play/"+data.channelName)
            } else {
                $('#error-message .header').text(data.message);
                $('#error-message .sub').text(data.submessage);
                $('#error-message').show()
            }
        });

        $("#create-input").on('input', () => {
            drawIt.content.validForm();
        });

        $("#welcome").text("Bienvenue " + this.data.session.name)

        this.socket.emit('request channels');

        this.socket.on('channels', (data) => {
            let div = $("#game_channels");
            if(data.channels) {
                if (data.channels.length === 0) {
                    div.hide();
                } else {
                    div.show();
                    let list = div.find('.list');
                    list.empty();
                    for (let channel of data.channels) {
                        list.append(
                            "            <div class=\"item\">\n" +
                            "                <div class=\"right floated content\">\n" +
                            "                    <a class=\"ui button\" href=\"/play/" + channel.name + "\">Rejoindre</a>\n" +
                            "                </div>\n" +
                            "                <img class=\"ui avatar image mini\" src=\"/assets/images/players/" + channel.design + ".png\">\n" +
                            "                <div class=\"content\">\n" +
                            "                    " + channel.name + "\n" +
                            "                    <div class=\"ui blue label\" style=\"margin-left: 10px\">\n" +
                            "                        " + channel.playercount + " / " + channel.maxplayers + "\n" +
                            "                    </div>\n" +
                            "                </div>\n" +
                            "            </div>"
                        );
                    }
                }
            }
        });

        $("#create-button").click(() => {
            drawIt.content.submitForm();
        });

        $("#error-message > i").click(() => {
            $('#error-message').hide('slow');
        });
    }

    submitForm() {
        if(!this.validForm())
            return;
        this.socket.emit('try create', {channelName: $("#create-input").val()});
    }

    validForm() {
        $(".error").removeClass("error");

        let input = $("#create-input");

        if(!/^[a-z0-9\-_]{3,15}$/i.test(input.val())){
            input.parent().addClass("error");
            $('#error-message .header').text("Nom du salon incorrect");
            $('#error-message .sub').text("Le nom d\'un salon doit comporter entre 3 et 15 caracteres alpha-numeriques.");
            $('#error-message').show();
            return false;
        }
        $('#error-message').hide()

        return true;
    };

    logout() {
        this.goto("/logout")
    };


    reset() {
        this.socket.close();
    };
};
drawIt.content = new drawIt.contentClass;