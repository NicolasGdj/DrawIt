drawIt.contentClass = class LogoutPage extends drawIt.pageContentClass{

    init() {
        super.init();
        this.socket = io('/logout');

        this.socket.on('logout', (data) => {
            if(data.code === 200){
                this.goto('/');
            }else{
                $("#logout-form-messages").show();
                let list = $("#logout-form-messages-list");
                list.empty();
                list.append($("<li />").text(data.message))
            }
        });

        $("#logout-btn").click(() => {
            drawIt.content.submitForm();
        });

    }

    getTitle(){
        return super.getTitle() + " - Déconnexion";
    }

    submitForm() {
        this.socket.emit('logout');
    }

    reset() {
        this.socket.close();
    };
};
drawIt.content = new drawIt.contentClass;