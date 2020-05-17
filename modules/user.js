module.exports = class User {

    constructor(name, mail, password) {
        this.name = name;
        this.mail = mail;
        this.password = password;
    }

    getName() {
        return this.name;
    }

    getMail(){
        return this.mail;
    }

    isPassword(password){
        return password === this.password;
    }
};