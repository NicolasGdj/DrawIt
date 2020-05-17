module.exports = class Channel {

    constructor(name, owner) {
        this.name = name;
        this.owner = owner;
        this.words = [];
        this.reset();
        this.join(owner, 'Joined new channel');
    }

    setWords(words) {
        this.words = words;
    }

    getName() {
        return this.name;
    }

    setOwner(owner) {
        this.owner = owner;
        this.users.forEach((user) => {
            user.emit('new owner', owner.id);
        });
    }

    getOwner(){
        return this.owner;
    }

    getNextChoice(){
        if(this.words.length === 0)
        return {first: "soleil", second: "plage", third: "avion"};
        return {
            first: this.words[Math.floor(Math.random() * this.words.length)],
            second: this.words[Math.floor(Math.random() * this.words.length)],
            third: this.words[Math.floor(Math.random() * this.words.length)],
        }
    }

    getPlayerCount(){
        return this.users.length;
    }

    getMaxPlayers(){
        return this.maxPlayers;
    }

    getUsers(){
        return this.users;
    }

    getUserInfos(){
        let userinfos = [];
        for(let user of this.users){
            userinfos.push({name: user.name, design: user.design, score: user.score, found: user.found});
        }
        return userinfos;
    }

    isFull(){
        return this.users.length >= this.maxPlayers;
    }

    update(){

        let data = {
            channelName: this.getName(),
            maxPlayers: this.maxPlayers,
            playerCount: this.getUsers().length,
            owner: this.getOwner().name,
            players: this.getUserInfos(),
            state: this.state,
            timer: this.timer,
            word: this.hint,
            index: this.index,
            round: this.round,
            lastWinner: this.lastWinner
        };

        this.users.forEach( (user) => {
            if(user == this.users[this.index]) {
                data.word = this.word;
                data.choice = this.choice;
            }else{
                data.word = this.hint;
                if(data.choice)
                    delete data.choice;
            }
            data.user = user.name;
            data.design = user.design;
            user.emit('update', data);
        });
    }

    start(){
        this.index = Math.floor(Math.random() * this.users.length);
        this.nextRound();
    }

    reset(){
        this.users = [];
        this.maxPlayers = 10;
        this.word = "";
        this.hint = "";
        this.lastWinner = "";
        this.state = 'waiting';
        this.timer = 20;
        this.maxTime = 120;
        this.index = 0;
        this.round = 0;
        this.users.forEach((user) => {
            user.score = 0;
        });
    }

    nextRound(){
        ++this.round;
        this.hint = "";
        do{
            ++this.index;
            if(this.index >= this.users.length) {
                this.index = 0;
            }
        }while(this.users[this.index] === undefined);

        this.state = "selection";
        this.timer = 20;

        this.users.forEach( (user) => {
            user.found = false;
        });


        this.users[this.index].found = true;

        this.chat(undefined, "Au tour de " + this.users[this.index].name, "#ffeb3b");

        this.playAllSound("your_turn");
        this.updateVotepass();

        this.choice = this.getNextChoice();

        this.update();

    }

    isUser(username){
        for(let user of this.users){
            if(user.name.toLowerCase() === username.toLowerCase()){
                return true;
            }
        }
        return false;
    }

    getMaxVotepass(){
        return this.users.length > 2 ? this.users.length-1 : 2;
    }

    playAllSound(sound){
        this.users.forEach((u) => {
            this.playSound(u, sound);
        })
    }

    playSound(user, sound){
        user.emit('play sound', {sound: sound});
    }

    resetVotepass(){
        for(let user of this.users)
            user.votepass = false;
    }

    updateVotepass(){
        let count = 0;
        for(let user of this.users) {
            if (user.votepass) {
                ++count;
            }
        }

        let max = this.getMaxVotepass();
        if(this.state === 'running' && count >= max){
            count = 0;
            this.resetVotepass();
            this.nextRound();
            this.update();
        }

        this.users.forEach((u) => {
            u.emit('votepass', {current: count, max: this.getMaxVotepass()});
        })
    }

    votepass(user){
        if(this.state === 'running' && (user.votepass === undefined || !user.votepass))
            user.votepass = true;
        else
            user.votepass = false;
        this.updateVotepass()
    }

    join(user, msg = 'Joined existing channel'){

        if(this.isFull()){
            user.emit('play', {code: 403, 'message': 'Ce salon est plein.'});
            return;
        }

        this.users.push(user);
        user.emit('play', {code: 200, 'message': msg});
        user.channel = this;
        user.found = false;
        user.score = 0;
        this.chat(undefined, '[+] ' + user.name);

        if(this.state === 'waiting' || this.state === 'launching'){
            this.inGame = this.users.slice();
        }
    }

    isRunning(){
        return this.state === 'running' || this.state === 'selection';
    }

    quit(user){

        if(this.isRunning() && this.getUsers().indexOf(user) === this.index){
            this.nextRound();
        }

        this.getUsers().splice(this.getUsers().indexOf(user), 1);

        this.chat(undefined, '[-] ' + user.name);

        if(this.getOwner() === user){
            if(this.getUsers().length !== 0){
                this.setOwner(this.getUsers()[0]);
                this.privateChat(undefined, this.getOwner(), "Vous etes le nouvel hote");
            }
        }

        user.channel = undefined;

    }

    answer(sender, message){
        if(this.isTurn(sender)){
            this.privateChat(undefined, sender, "Vous ne pouvez pas ecrire quand vous dessinez.");
            return true;

        }
        if(sender.found) {
            this.privateChat(undefined, sender, "Vous avez deja trouve la reponse.");
            return true;
        }
        if(message.toLowerCase() === this.word.toLowerCase()) {
            let score = parseInt(500/this.maxTime*this.timer);
            this.chat(undefined, sender.name + " a trouve (+"+score+")", "#29e31c")
            sender.found = true;
            sender.score += score;

            let i = 0;
            for(let user of this.users){
                if(!user.found)
                    ++i;
            }
            if(i === 0){
                this.nextRound()
            }

            return true;
        }
        return false;
    }

    selectChoice(sender, word){
        if(!this.isTurn(sender) || this.state !== "selection"){
            return;
        }
        if(this.choice !== undefined && (this.choice.first === word || this.choice.second === word || this.choice.third === word)){
            this.startRound(word);
        }
    }

    chat(sender, message, color="#b2bec3"){
        if(message.length == 0 || message.length > 200)
            return;
        if(!(sender !== undefined && this.state === 'running') || (sender !== undefined && this.state === 'running' && !this.answer(sender, message))) {
            this.users.forEach((user) => {
                user.emit('chat message', {
                    message: message,
                    design: (sender === undefined ? undefined : sender.design),
                    sender: (sender === undefined ? '' : sender.name),
                    color: color
                });
            });
        }
    }

    privateChat(sender, receiver, message){
        receiver.emit('chat message', {message: message, sender: (sender === undefined ? '' : sender.name)});
    }

    isTurn(sender) {
        return (sender === this.users[this.index]);
    }

    startRound(word){
        this.timer = this.maxTime;
        this.state = 'running';
        this.word = word;
        this.users.forEach( (user) => {
            user.found = false;
            user.votepass = false;
        });
        this.users[this.index].found = true;
        this.hint = "";
        for (let c of this.word){
            if(/[a-z]/i.test(c)){
                this.hint +="_";
            }else{
                this.hint += c;
            }
        }
        this.update();
    }

    nextHint(){
        let lastHint = this.hint;
        while(lastHint === this.hint) {
            let tmp = "";

            let index = Math.floor(Math.random() * this.hint.length);
            let i = 0;
            let foundOne = false;
            console.log("Index: " + index);

            for (let c of this.hint) {
                if(!foundOne && c === "_")
                    foundOne = true;
                if (i === index && c === "_") {
                    tmp += this.word[i];
                    console.log("Char at "+i+": " + c + " New letter : "+this.word[i]+" tmp = " + tmp);
                } else {
                    tmp += c;
                }
                ++i;
            }
            if(!foundOne)
                return;
            this.hint = tmp;

        }
    }

    addLine(sender, data){
        if(this.isTurn(sender)) {
            this.users.forEach( (user) => {
                if(user === sender)
                    return;
                user.emit('add line', data);
            });
        }
    }

    setBackground(sender, data){
        if(this.isTurn(sender)){
            //REFACTOR AND CHECK DATAS
            this.users.forEach( (user) => {
                if(user === sender)
                    return;
                user.emit('set background', data);
            });
        }
    }

    clear(sender, data){
        if(this.isTurn(sender)){
            //REFACTOR AND CHECK DATAS
            this.users.forEach( (user) => {
                if(user === sender)
                    return;
                user.emit('clear');
            });
        }
    }

    restore(sender, data){
        if(this.isTurn(sender)){
            //REFACTOR AND CHECK DATAS
            this.users.forEach( (user) => {
                if(user === sender)
                    return;
                user.emit('restore');
            });
        }
    }

    setAll(sender, data){
        if(this.isTurn(sender)){
            //REFACTOR AND CHECK DATAS
            this.users.forEach( (user) => {
                if(user === sender)
                    return;
                user.emit('set all', data);
            });
        }
    }

    run(tick){
        switch (this.state) {
            case 'waiting':
                if(this.users.length >= 2){
                    this.start();
                }
                break;
            case 'selection':
                if(this.users.length === 1){
                    this.state = 'waiting';
                    this.update();
                }else if(--this.timer <= 0) {
                    let selectIndex = Math.floor(Math.random() * 3);
                    if(selectIndex === 0){
                        this.word = this.choice.first;
                    }else if(selectIndex === 1){
                        this.word = this.choice.second;
                    }else {
                        this.word = this.choice.third;
                    }
                    this.startRound(this.word);
                }else{
                    this.update();
                }
                break;
            case 'running':
                if(this.users.length === 1){
                    this.state = 'waiting';
                    this.update();
                }else if(--this.timer <= 0) {
                    this.nextRound();
                }else{
                    if(this.timer <= 60 && (this.timer%Math.floor(60/(this.word.length-1))) === 0){
                        this.nextHint();
                    }
                    this.update();
                }
                break;
            default:
                break;
        }
    }
};