$.contentClass = class PlayPage extends PageContent{

    init() {
        super.init();
        this.socket = io('/play');
        this.design = "walter";
        $("#channel_name").html(this.data.channelName);
        $("#username").val(this.data.session.name);

        $("#join-menu-back").on('click', () => $.content.goto("/"));
        $("#chat-go-back").on('click', () => $.content.goto("/"));

        $("#classement").on('click', () => {
            $("#classement").hide();
            $("#classement-hamburger").show();
        });

        $("#classement-hamburger").on('click', () => {
            $("#classement").show();
            $("#classement-hamburger").hide();
        });

        this.sounds = {
            fail: new Audio("/assets/sounds/fail.wav"),
            start_in: new Audio("/assets/sounds/start_in.wav"),
            sucess: new Audio("/assets/sounds/sucess.wav"),
            votepass: new Audio("/assets/sounds/votepass.wav"),
            your_turn: new Audio("/assets/sounds/your_turn.wav"),
            tick: new Audio("/assets/sounds/tick.wav"),
        };

        this.canvas_data = {
            item : document.getElementById("game-canvas"),
            jItem : $("#game-canvas"),
            ctx : document.getElementById("game-canvas").getContext("2d"),
            crown : {
                item: document.getElementById("crown"),
                size: 25,
            },
            players:{
                walter: {
                    color: '#22a6b3',
                    item: document.getElementById("player-walter"),
                },
                sophie: {
                    color: '#eb4d4b',
                    item: document.getElementById("player-sophie"),
                },
                alix: {
                    color: '#c44569',
                    item: document.getElementById("player-alix"),
                },
                bob: {
                    color: '#f9ca24',
                    item: document.getElementById("player-bob"),
                },
                edouardo: {
                    color: '#30336b',
                    item: document.getElementById("player-edouardo"),
                },
                robert: {
                    color: '#badc58',
                    item: document.getElementById("player-robert"),
                }
            }
        };

        $('#join-button').on('click', () => $.content.tryConnect());

        $('#chat-input').keypress((event) => {
            var keycode = (event.keyCode ? event.keyCode : event.which);
            if(keycode == '13'){
                let chat_input = $('#chat-input');
                $.content.socket.emit('chat message', {message: chat_input.val()});
                chat_input.val("");
                return false;
            }
        });

        this.socket.on('play', (result) => {
            $("#join-result").hide();

            if(result.code === 200){
                console.log("Connexion réussie. ("  + result.message + ")");
                $("#join-menu").hide();
            }else{
                $("#join-result").show();
                $("#join-result").text(result.message);
                console.log("Connexion échoué. ("  + result.message + ")");
            }
        });

        this.socket.on('chat message', (data) => {
            if(data.sender === undefined || data.sender === ''){
                $("#chat-content").append("<p style=\"color: "+data.color+"\" class='private-message'>" + data.message + "</p>");
            }else {
                $("#chat-content").append("<p><span style=\"color:"+$.content.canvas_data.players[data.design].color+"\">" + data.sender + ": </span>" + data.message + "</p>");
            }
            $('#chat-content').scrollTop($('#chat-content')[0].scrollHeight);

        });

        this.socket.on('answer', (data) => {
            $.content.playSound($.content.sounds.sucess);
        });

        this.socket.on('votepass', (data) => {
            $.content.updateVotePass(data.current, data.max);
        });

        $('#votepass').on('click', () => {
            $.content.socket.emit('votepass', {})
        });

        this.socket.on('update', (game) => {
            let last = $.content.game;
            $.content.game = game;
            this.updateClassement();

            if(last === undefined || last.state !== game.state){
                $.content.clearAll();

                if(game.state === "waiting"){
                    $("#votepass").hide();
                    $("#game-selection").hide();
                    $("#top-text").html("En attente de joueurs...");
                    $("#game-timer").hide();
                }else if(game.state === "running"){
                    $("#game-selection").hide();
                    $("#votepass").show();
                    $.content.playSound($.content.sounds.your_turn);
                }else if(game.state === "selection"){
                    $("#votepass").hide();
                    $("#game-timer").show();
                    if($.content.isMyTurn() && game.choice) {
                        $("#choice1").html(game.choice.first);
                        $("#choice2").html(game.choice.second);
                        $("#choice3").html(game.choice.third);
                        $("#game-selection").show();
                    }
                }
            }
            if(game.state === "selection" && game.players.length > game.index){
                $.content.playSound($.content.sounds.start_in);
                $("#top-text").html("Au tour de " + game.players[game.index].name + " (" + game.timer + ")");
            }else if(game.state === "running"){
                $("#top-text").html(game.word);
                $("#game-timer").html(game.timer);
            }
        });


        this.socket.on('add line', (data) => {
            $.content.draw.lines.push(data.line);
        });

        this.socket.on('set background', (data) => {
            $.content.background = data.color;
        });

        this.socket.on('clear', _ => {
            $.content.draw.lines = [];
        });

        this.socket.on('restore', _ => {
            $.content.draw.lines = [];
            $.content.background = "white";
        });

        this.ignoreTick = 0;
        this.tick = 0;
        this.intervalID = requestAnimationFrame(() => $.content.update());

        this.mouse = {
            x: 0,
            y: 0,
            click: false,
            pointer: {
                radius: -1,
                color: 'black'
            }
        };
        this.background = "white";

        this.canvas_data.jItem.mousemove((evt) => {
            if($.content.isMyTurn()) {
                let rect = $.content.canvas_data.item.getBoundingClientRect();
                let mouse = $.content.mouse;
                mouse.x = evt.clientX - rect.left;
                mouse.y = evt.clientY - rect.top;
                let width = $.content.width;
                let height = $.content.height;
                if (mouse.click && $.content.isMyTurn() && (++$.content.ignoreTick) % 2 === 0 && $.content.draw.lines.length !== 0) {
                    $.content.draw.lines[$.content.draw.lines.length - 1].next.push({
                        x: mouse.x / width,
                        y: mouse.y / height
                    });
                }
            }
        }).mouseup(() => {
            if($.content.isMyTurn()) {
                let mouse = $.content.mouse;
                if (mouse.click) {
                    this.socket.emit('add line', {
                        line: $.content.draw.lines[$.content.draw.lines.length - 1]
                    });
                }
                mouse.click = false;
            }
        }).mouseleave(() => {
            if($.content.isMyTurn()) {
                let mouse = $.content.mouse;
                if (mouse.click) {
                    this.socket.emit('add line', {
                        line: $.content.draw.lines[$.content.draw.lines.length - 1]
                    });
                }
                mouse.click = false;
            }
        })
        .mousedown(() => {
            if($.content.isMyTurn()) {
                let mouse = $.content.mouse;
                let width = $.content.width;
                let height = $.content.height;
                mouse.click = true;
                if ($.content.isMyTurn()) {
                    $.content.draw.lines.push({
                        radius: mouse.pointer.radius,
                        color: mouse.pointer.color,
                        start: {x: mouse.x / width, y: mouse.y / height},
                        next: []
                    });
                }
            }
        });

        this.draw = {
            lines : [],
        }

        this.colorPicker = {
            click: false,
            x: 0,
        };

        this.sizePicker = {
            click: false,
            x: 0,
        };

        this.backgroundPicker = {
            click: false,
            x: -1,
        };

        $("#color-picker").mousemove((evt) => {
            let rect = $("#color-picker")[0].getBoundingClientRect();
            if($.content.colorPicker.click) {
                $.content.colorPicker.x = evt.clientX - rect.left;
                $.content.updateOption();
            }
        }).mouseup(() => {
            $.content.colorPicker.click = false;
            $.content.updateOption();
        }).mouseleave(() => {
            $.content.colorPicker.click = false;
            $.content.updateOption();
        })
        .mousedown((evt) => {
            $.content.colorPicker.click = true;
            let rect = $("#color-picker")[0].getBoundingClientRect();

            $.content.colorPicker.x = evt.clientX - rect.left;
            $.content.updateOption();
        });

        $("#size-picker").mousemove((evt) => {
            let rect = $("#size-picker")[0].getBoundingClientRect();
            if($.content.sizePicker.click) {
                $.content.sizePicker.x = evt.clientX - rect.left;
                $.content.updateOption();
            }
        }).mouseup(() => {
            $.content.sizePicker.click = false;
            $.content.updateOption();
        }).mouseleave(() => {
            $.content.sizePicker.click = false;
            $.content.updateOption();
        })
        .mousedown((evt) => {
            $.content.sizePicker.click = true;
            let rect = $("#size-picker")[0].getBoundingClientRect();

            $.content.sizePicker.x = evt.clientX - rect.left;
            $.content.updateOption();
        });

        $("#background-picker").mousemove((evt) => {
            let rect = $("#background-picker")[0].getBoundingClientRect();
            if($.content.backgroundPicker.click) {
                $.content.backgroundPicker.x = evt.clientX - rect.left;
                $.content.updateOption();
            }
        }).mouseup(() => {
            $.content.backgroundPicker.click = false;
            this.socket.emit('set background', {
                color : $.content.background
            });
            $.content.updateOption();
        }).mouseleave(() => {
            $.content.backgroundPicker.click = false;
            this.socket.emit('set background', {
                color : $.content.background
            });
            $.content.updateOption();
        })
        .mousedown((evt) => {
            $.content.backgroundPicker.click = true;
            let rect = $("#background-picker")[0].getBoundingClientRect();

            $.content.backgroundPicker.x = evt.clientX - rect.left;
            $.content.updateOption();
        });

        $("#restore").click(() => {
            if($.content.isMyTurn()) {

                $.content.draw.lines = [];
                $.content.colorPicker.x = 0;
                $.content.sizePicker.x = 0;
                $.content.backgroundPicker.x = -1;
                $.content.socket.emit('restore');

                this.updateOption();
            }
        }).dropdown({
            on: 'hover'
        });

        $("#eraser").click(() => {
            if($.content.isMyTurn()) {
                $.content.mouse.pointer.color = "$";
            }
        }).dropdown({
            on: 'hover'
        });

        $("#pencil").click(() => {
            if($.content.isMyTurn()) {
                $.content.mouse.pointer.color = $.content.mouse.pointer.lastColor;
            }
        }).dropdown({
            on: 'hover'
        })
        ;

        $("#delete").click(() => {
            if($.content.isMyTurn()) {
                $.content.draw.lines = [];
                $.content.socket.emit('clear');

                this.updateOption();
            }
        }).dropdown({
            on: 'hover'
        });

        this.updateOption();

        $("#options-close").click(() => {
            $("#options").fadeTo("fast", 0.0, function () {
                $("#options").css('z-index', -1);
            });
        });

        $("#options-open").click(() => {
            if($.content.isMyTurn()) {
                let options = $("#options");
                $("#options").css('z-index', 2);

                $("#options").fadeTo("fast", 1.0);
            }
        }).dropdown({
            on: 'hover'
        });

    }

    choice(index){
        let choice = $("#choice" + index);
        if(!choice)
            return;
        this.socket.emit("choice", {choice: choice.html()});
    }

    isMyTurn(){
        return this.game !== undefined && this.game.current !== undefined && this.game.current.name === this.game.user;
    }

    updateOption() {
        this.updateColorPicker();
        this.updateSizePicker();
        this.updateBackgroundPicker();
    }

    updateColorPicker(){
        let canvas = $("#color-picker");
        let ctx = canvas[0].getContext('2d');

        canvas.attr('width', canvas.width());
        canvas.attr('height', canvas.height());
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let grd = ctx.createLinearGradient(0, 0, canvas.width(), 0);
        grd.addColorStop(0, 'black');
        grd.addColorStop(1 / 6, 'white');
        grd.addColorStop(2 / 6, 'red');
        grd.addColorStop(3 / 6, 'yellow');
        grd.addColorStop(4 / 6, 'green');
        grd.addColorStop(5 / 6 - 0.05, 'cyan');
        grd.addColorStop(5 / 6 + 0.05, 'blue');
        grd.addColorStop(6 / 6, 'indigo');

        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width(), canvas.height());

        let pixel = ctx.getImageData(this.colorPicker.x, 0, 1, 1).data;
        this.mouse.pointer.color = 'rgb(' + pixel[0] + ', ' + pixel[1] + ', ' + pixel[2] + ')';
        this.mouse.pointer.lastColor = this.mouse.pointer.color;

        ctx.beginPath();
        ctx.arc(this.colorPicker.x, canvas.height()/2, 20, 0, 2 * Math.PI, false);
        ctx.fillStyle = this.mouse.pointer.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "white";
        ctx.stroke();

    }

    updateSizePicker(){
        let canvas = $("#size-picker");
        let ctx = canvas[0].getContext('2d');

        canvas.attr('width', canvas.width());
        canvas.attr('height', canvas.height());
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if(this.mouse.pointer.color !== "$")
          ctx.fillStyle = this.mouse.pointer.color;

        ctx.beginPath();
        ctx.moveTo(0, canvas.height()/2 + 3);
        ctx.lineTo(0, canvas.height()/2 - 3);
        ctx.lineTo(canvas.width(), 0);
        ctx.lineTo(canvas.width(), canvas.height());
        ctx.closePath();
        ctx.fill();

        this.mouse.pointer.radius = ((canvas.height()/2-3)*this.sizePicker.x/canvas.width() + 5)/this.width;

        ctx.beginPath();
        ctx.arc(this.sizePicker.x, canvas.height()/2, ((canvas.height()/2-3)*this.sizePicker.x/canvas.width() + 5), 0, 2 * Math.PI, false);
        ctx.fillStyle = this.mouse.pointer.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "white";
        ctx.stroke();
    }

    updateBackgroundPicker(){
        let canvas = $("#background-picker");
        let ctx = canvas[0].getContext('2d');

        canvas.attr('width', canvas.width());
        canvas.attr('height', canvas.height());
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if(this.backgroundPicker.x === -1){
            this.backgroundPicker.x = 1 / 6 * 296;
        }
        let grd = ctx.createLinearGradient(0, 0, canvas.width(), 0);
        grd.addColorStop(0, 'black');
        grd.addColorStop(1 / 6, 'white');
        grd.addColorStop(2 / 6, 'red');
        grd.addColorStop(3 / 6, 'yellow');
        grd.addColorStop(4 / 6, 'green');
        grd.addColorStop(5 / 6 - 0.05, 'cyan');
        grd.addColorStop(5 / 6 + 0.05, 'blue');
        grd.addColorStop(6 / 6, 'indigo');

        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width(), canvas.height());

        let pixel = ctx.getImageData(this.backgroundPicker.x, 0, 1, 1).data;
        this.background = 'rgb(' + pixel[0] + ', ' + pixel[1] + ', ' + pixel[2] + ')';

        ctx.beginPath();
        ctx.arc(this.backgroundPicker.x, canvas.height()/2, 20, 0, 2 * Math.PI, false);
        ctx.fillStyle = this.background;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "white";
        ctx.stroke();
    }


    clear(){
        this.draw.lines.clear();
    }

    clearAll(){
        this.draw.lines = [];
        this.colorPicker.x = 0;
        this.sizePicker.x = 0;
        this.backgroundPicker.x = -1;
        this.updateOption();
    }

    playSound(sound){
        sound.pause();
        sound.volume = 0.4;
        sound.currentTime = 0;
        sound.play();
    }

    updateVotePass(current, max) {
        $("#votepass").text("Voter pour passer : " + current + "/" + max);
    }

    tryConnect(){
        console.log("Connexion au serveur...")
        this.socket.emit('play', {id: this.data.channelName, name: this.data.session.name, design: this.design});
    }

    changeDesign(name) {
        $(".selected").removeClass("selected");
        $("#player-"+name).addClass("selected");
        this.design = name;
    }


    sortScore(userA,userB)  {
        if(userA.score === userB.score)
            return 0;
        return userA.score > userB.score ? -1 : 1;
    }

    updateClassement() {
        this.game.classement = this.game.players;
        this.game.classement.sort($.content.sortScore);
        let classement = $("#classement tbody");
        classement.empty();
        for(let i = 1; i <= this.game.classement.length; ++i){
            let player = this.game.classement[i-1];
            classement.append(
                "<tr " + (player.found ? "class='found'" : "") +">" +
                "   <td>"+i+"</td>" +
                "   <td><img class='classement-image' src='/assets/images/players/"+player.design+".png'/></td>" +
                "   <td>"+player.name+"</td>" +
                "   <td>"+player.score+"</td>" +
                "</tr>"
            );
        }
    }


    getTitle(){
        return super.getTitle() + " - " + this.data.channelName;
    }

    reset() {
        cancelAnimationFrame(this.intervalID);
        this.socket.close();
    };

    update() {
        requestAnimationFrame(() => $.content.update());

        let canvas = this.canvas_data.jItem;
        this.width = canvas.width();
        this.height = canvas.height();
        if(this.mouse.pointer.radius === -1){
            this.mouse.pointer.radius = 5/this.width;
        }

        canvas.height(4 * this.width / 6);
        canvas.attr('width', this.width);
        canvas.attr('height', this.height);

        let ctx = this.canvas_data.ctx;

        ctx.clearRect(0, 0, this.width, this.height);

        ctx.fillStyle = this.background;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.lineJoin = "round";

        for (let line of $.content.draw.lines) {
            if(line === undefined)
                continue;

            ctx.beginPath();
            ctx.fillStyle = (line.color === "$" ? this.background : line.color);
            ctx.strokeStyle = (line.color === "$" ? this.background : line.color);
            ctx.arc(line.start.x * this.width, line.start.y * this.height, line.radius * this.width, 0, 2 * Math.PI);
            ctx.fill();

            ctx.beginPath();
            ctx.lineWidth = 2 * line.radius * this.width;

            ctx.moveTo(line.start.x * this.width, line.start.y * this.height);
            if (line.next.length !== 0) {
                 let last;
                    for (let l of line.next) {
                        ctx.lineTo(l.x * this.width, l.y * this.height);
                        last = l;
                    }
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(last.x * this.width, last.y * this.height, line.radius * this.width, 0, 2 * Math.PI);
                    ctx.fill();

            }
        }

        if (!this.mouse.click && this.isMyTurn()) {
            ctx.beginPath();
            ctx.fillStyle = (this.mouse.pointer.color === "$" ? this.background : this.mouse.pointer.color);
            ctx.arc(this.mouse.x, this.mouse.y, this.mouse.pointer.radius * this.width, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
};
$.content = new $.contentClass;