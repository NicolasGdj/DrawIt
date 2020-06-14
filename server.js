'use strict';

let express = require('express');
let app = express();
const fs = require('fs');

let config = require('./config.js');
let bodyParser = require('body-parser');
let session = require('express-session')({
    secret: config.session_key,
    resave: true,
    saveUninitialized: true,
    cookie: {secure: false}
});
let sharedsession = require("express-socket.io-session");
let Channel = require('./modules/channel');
let User = require('./modules/user');
let words = require('./modules/words')
let md5 = require('md5');

let http = require('https').createServer({
    key: fs.readFileSync(config.ssl.key_path),
    cert: fs.readFileSync(config.ssl.cert_path)
}, app);

//let http = require('http').createServer(app);

let io = require('socket.io')(http);

//Moteur de template
app.set('view engine', 'ejs');

// Middleware
app.use('/assets', express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(session);

io.use(sharedsession(session, {
    autoSave: true
}));

io.use(function(socket, next) {
    session(socket.request, socket.request.res, next);
});

function getChannelsInfo(){
    let channelsinfo = [];
    for(let channel of channels){
        channelsinfo.push({name: channel.getName(), design: (channel.getOwner().design === undefined ? "walter" : channel.getOwner().design), playercount: channel.getPlayerCount(), maxplayers: channel.getMaxPlayers()});
    }
    return channelsinfo;
}

//Routes
app.get('*', (request, response) => {
    response.render('index')
});

http.listen(config.port, () => {
    console.log("Server listening on *:" + config.port);
});


let channels = [];
let users = [];

users.push(new User("test", "a@a.fr", md5("testtest")));
users.push(new User("pons", "p@o.ns", md5("ponspons")));

function isConnected(session = undefined){
    if(!session)
        return false;
    return session.user !== undefined;
}

function getUser(session = undefined){
    if(session === undefined)
        return null;
    return session.user;
}

io.of('/register').on('connection', (socket) => {
    socket.on('register', (data) => {
        if(!data.id || !data.mail || !data.password){
            socket.emit('register', {code: 401, message: "Informations manquante."});
            return;
        }
        for(let user of users){
            if(user.getName() === data.id){
                socket.emit('register', {code: 401, message: "Nom d'utilisateur deja utilise"});
                return;
            }else if(user.getMail() === data.mail){
                socket.emit('register', {code: 401, message: "Email deja utilise"});
                return;
            }
        }
        users.push(new User(data.id, data.mail, md5(data.password)));
        socket.emit('register', {code: 200, message: "Ok"});
    });
});

io.of('/login').on('connection', (socket) => {
    socket.on('login', (data) => {
        if(!data.id || !data.password){
            socket.emit('login', {code: 401, message: "Informations manquante."});
            return;
        }
        for(let user of users){
            if((user.getName() === data.id || user.getMail() === data.mail) && user.isPassword(md5(data.password))){
                socket.request.session.user = user;
                socket.request.session.save();
                socket.emit('login', {code: 200, message: "Ok"});
                return;
            }
        }
        socket.emit('login', {code: 401, message: "Mauvais identifiant ou mot de passe."});
    });
});

io.of('/logout').on('connection', (socket) => {
    socket.on('logout', (data) => {
        if(isConnected(socket.request.session)){
            delete socket.request.session.user;
            socket.request.session.save();
            socket.emit('logout', {code: 200, message: "Ok"});
        }else{
            socket.emit('logout', {code: 401, message: "Vous n'etes pas connecte."});
        }
    });
});

io.of('/index').on('connection', (socket) => {
    socket.on('request channels', _ => {
        socket.emit('channels', {channels: getChannelsInfo()})
    });

    socket.on('try create', (data) => {
        if(data.channelName === undefined)
            return;

        let channelName = data.channelName;
        if(!(channelName.length >= 3 && channelName.length <= 15) || !(/^[aA-zZ0-9]*$/.test(channelName))){
            socket.emit('try create', {code: 402, message: 'Nom du salon incorrect', submessage: 'Le nom d\'un salon doit comporter entre 3 et 15 caracteres alpha-numeriques.'});
            return;
        }
        for(let channel of channels) {
            if (channel.getName() === channelName) {
                socket.emit('try create', {code: 402, message: 'Salon deja existant', submessage: 'Vous pouvez rejoindre ce salon dans la section ci-dessus.'});
                return;
            }
        }
        socket.emit('try create', {code: 200, message: 'Connexion au salon...', channelName: channelName});

    });
});

io.of('/play').on('connection', (socket) => {
    socket.on('play', (data) => {
        if(data.id === undefined || data.design === undefined)
            return;

        let channelName = data.id;
        if(!(channelName.length >= 3 && channelName.length <= 15) || !(/^[aA-zZ0-9]*$/.test(channelName))){
            socket.emit('play', {code: 402, 'message': 'Unknown channel'});
            return;
        }

        if(!(data.design.length >= 3 && data.design.length <= 16) || !(/^[aA-zZ0-9]*$/.test(data.design))) {
            socket.emit('play', {code: 405, 'message': 'Bad design'});
            return;
        }

        socket.user = getUser(socket.request.session);
        socket.name = socket.user ? socket.user.name : "Unknown";
        socket.design = data.design;

        for(let channel of channels) {
            if (channel.getName() === channelName) {
                if(channel.isUser(socket.name)){
                    socket.emit('play', {code: 401, 'message': 'Username already used'});
                    return;
                }
                if(channel.isFull()){
                    socket.emit('play', {code: 406, 'message': 'Channel is full'});
                    return;
                }

                channel.join(socket);
                channel.update();
                io.of('/index').emit('channels', {channels: getChannelsInfo()})

                return;
            }
        }

        socket.channel = new Channel(channelName, socket);
        socket.channel.setWords(words);
        channels.push(socket.channel);
        socket.channel.update();
        io.of('/index').emit('channels', {channels: getChannelsInfo()})

    });


    socket.on('chat message', (data) => {
        if(data.message === undefined)
            return;
        let sender = socket;
        let message = data.message;
        if(socket.channel !== undefined)
            socket.channel.chat(sender, message);
    });

    socket.on('votepass', (data) => {
        if(socket.channel !== undefined) {
            socket.channel.votepass(socket);
        }
    });

    socket.on('choice', (data) => {
        if(data.choice)
            if(socket.channel !== undefined) {
                socket.channel.selectChoice(socket, data.choice);
            }
    });

    socket.on('add line', (data) => {
        if(socket.channel !== undefined) {
            socket.channel.addLine(socket, data);
        }
    });

    socket.on('clear', (data) => {
        if(socket.channel !== undefined) {
            socket.channel.clear(socket, data);
        }
    });

    socket.on('restore', (data) => {
        if(socket.channel !== undefined) {
            socket.channel.restore(socket, data);
        }
    });

    socket.on('set background', (data) => {
        if(socket.channel !== undefined) {
            socket.channel.setBackground(socket, data);
        }
    });

    socket.on('setAll', (data) => {
        if(socket.channel !== undefined) {
            socket.channel.setAll(socket, data);
        }

    });

    socket.on('disconnect', () => {
        let channel = socket.channel;
        if(channel !== undefined){
            channel.quit(socket);
            channel.update();
            if(channel.getPlayerCount() === 0){
                channels.splice(channels.indexOf(channel), 1);
            }
        }
    });
});

io.on('connection', (socket) => {
    socket.name = "Unknown";

    socket.on('load', (data) => {
        let url = "/assets/page/login.html";
        let script = "/assets/js/login.js";
        let custom_data = {};

        let connected = isConnected(socket.request.session);

        if(data.path){
            if(!connected && data.path  === "/register") {
                url = "/assets/page/register.html";
                script = "/assets/js/register.js";
            }else if(connected && data.path === "/logout") {
                url = "/assets/page/logout.html";
                script = "/assets/js/logout.js";
            }else if(connected && /^\/play\/[a-z0-9\-_]{3,16}$/i.test(data.path)) {
                url = "/assets/page/play.html";
                script = "/assets/js/play.js";
                custom_data.channelName = data.path.substring("/play/".length);
            }else{
                if(connected) {
                    url = "/assets/page/index.html";
                    script = "/assets/js/index.js";
                }
            }
            if(connected){
                let user = getUser(socket.request.session);
                custom_data.session = {};
                custom_data.session.name = user ? user.name : "Unknown";
            }
            socket.emit('load', {url: url, script: script, data: custom_data});
        }

    });
});

let tick = 0;
setInterval(() => {
    ++tick;
    channels.forEach((channel) => {
        channel.run(tick)
    });
}, 1000);