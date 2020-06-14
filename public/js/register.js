drawIt.contentClass = class RegisterPage extends drawIt.pageContentClass{

    init() {
        super.init();
        this.socket = io('/register');

        let form = $("#register-form");
        form.find('[name="id"]').on('input', () => {drawIt.content.validForm()});
        form.find('[name="mail"]').on('input', () => {drawIt.content.validForm()});
        form.find('[name="password"]').on('input', () => {drawIt.content.validForm()});
        form.find('[name="repassword"]').on('input', () => {drawIt.content.validForm()});

        this.socket.on('register', (data) => {
            if(data.code === 200){
                this.login();
            }else{
                $("#loader").hide();
                drawIt.resetProgressbar();
                $("#register-form-messages").show();
                let list = $("#register-form-messages-list");
                list.empty();
                list.append($("<li />").text(data.message))
            }
        });


        $("#register-form > .submit").click(() => {
            drawIt.content.submitForm();
        });

        $("#login-btn").click(() => {
            drawIt.content.login();
        });
    }

    getTitle(){
        return super.getTitle() + " - Inscription";
    }

    login() {
        this.goto("/login")
    };

    validForm() {
        let form = $("#register-form");
        let messages = $("#register-form-messages");
        let list = $("#register-form-messages-list");
        list.empty();
        messages.hide();

        $("#register-form > .error").removeClass("error");

        let id = form.find('[name="id"]');
        if(!/^[a-z0-9\-_]{3,16}$/i.test(id.val())){
            id.parent().parent().addClass("error");
            messages.show();
            list.append($("<li />").text("L'identifiant doit contenir entre 3 et 16 caractères."))
        }

        let mail = form.find('[name="mail"]');
        if(!/^[a-z0-9\-_]+@[a-z0-9\-_]+\.[aA-zZ]{2,}$/i.test(mail.val())){
            mail.parent().parent().addClass("error");
            messages.show();
            list.append($("<li />").text("L'e-mail renseigné n'est pas valide."))
        }

        let password = form.find('[name="password"]');
        if(!/^.{8,}$/i.test(password.val())){
            password.parent().parent().addClass("error");
            messages.show();
            list.append($("<li />").text("Le mot de passe doit contenir plus de 7 caractères."))
        }

        let repassword = form.find('[name="repassword"]');
        if(password.val() !== repassword.val()){
            repassword.parent().parent().addClass("error");
            messages.show();
            list.append($("<li />").text("Les mots de passe ne sont pas identique"))
        }

        return list.is(':empty');
    };

    submitForm() {
        if(!this.validForm())
            return;
        let form = $("#register-form");
        let id = form.find('[name="id"]');
        let mail = form.find('[name="mail"]');
        let password = form.find('[name="password"]');
        this.socket.emit('register', {id: id.val(), mail: mail.val(), password: password.val()});
        drawIt.resetProgressbar();
        drawIt.startProgressbar(80);
        $("#loader").show();
    }

    reset() {
        this.socket.close();
    };
};
drawIt.content = new drawIt.contentClass;