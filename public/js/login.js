drawIt.contentClass = class LoginPage extends drawIt.pageContentClass{

    init() {
        super.init();
        this.socket = io('/login');

        let form = $("#login-form");
        form.find('[name="id"]').on('input', () => {
            drawIt.content.validForm()
        });
        form.find('[name="password"]').on('input', () => {
            drawIt.content.validForm()
        });

        this.socket.on('login', (data) => {
            if (data.code === 200) {
                setTimeout(() => {
                    drawIt.content.goto("/");
                }, 1000)
            } else {
                $("#loader").hide();
                drawIt.resetProgressbar();

                $("#login-form-messages").show();
                let list = $("#login-form-messages-list");
                list.empty();
                list.append($("<li />").text(data.message))
            }
        });

        $("#login-form > .submit").click(() => {
            drawIt.content.submitForm();
        });

        $("#register-btn").click(() => {
            drawIt.content.register();
        });
    }

    getTitle(){
        return super.getTitle() + " - Connexion";
    }

    validForm() {
        let form = $("#login-form");
        let messages = $("#login-form-messages");
        let list = $("#login-form-messages-list");
        list.empty();
        messages.hide();

        $("#login-form > .error").removeClass("error");

        let id = form.find('[name="id"]');
        if(!/^[a-z0-9\-_]{3,16}$/i.test(id.val())){
            id.parent().parent().addClass("error");
            messages.show();
            list.append($("<li />").text("L'identifiant doit contenir entre 3 et 16 caractères."))
        }

        let password = form.find('[name="password"]');
        if(!/^.{8,}$/i.test(password.val())){
            password.parent().parent().addClass("error");
            messages.show();
            list.append($("<li />").text("Le mot de passe doit contenir plus de 7 caractères."))
        }

        return list.is(':empty');
    };

    submitForm() {
        if(!this.validForm())
            return;
        let form = $("#login-form");
        let id = form.find('[name="id"]');
        let password = form.find('[name="password"]');
        drawIt.resetProgressbar();
        drawIt.startProgressbar(80);
        $("#loader").show();
        this.socket.emit('login', {id: id.val(), password: password.val()});
    }

    register() {
        this.goto("/register")
    };

    reset() {
        this.socket.close();
    };
}
drawIt.content = new drawIt.contentClass;