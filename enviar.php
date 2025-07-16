<?php
// Verifica se o formulário foi enviado usando o método POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // **PARA QUEM VOCÊ QUER ENVIAR O E-MAIL?**
    // Substitua pelo seu e-mail
    $recipient_email = "guilherme.almeida@enipro.com.br";

    // --- Coleta e limpa os dados do formulário ---
    // A função filter_var com FILTER_SANITIZE_* ajuda a prevenir ataques básicos.
    $name = filter_var(trim($_POST["name"]), FILTER_SANITIZE_STRING);
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $subject_form = filter_var(trim($_POST["subject"]), FILTER_SANITIZE_STRING);
    $message = filter_var(trim($_POST["message"]), FILTER_SANITIZE_STRING);

    // --- Validação simples ---
    // Verifica se os campos essenciais não estão vazios e se o e-mail é válido.
    if (empty($name) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        // Se houver um erro, redireciona de volta para a página de contato com um status de erro.
        header("Location: index.html#contato?status=error");
        exit;
    }

    // --- Montagem do E-mail ---

    // Assunto do e-mail que você vai receber
    $subject = "Nova mensagem do site Enipro: " . $subject_form;

    // Corpo da mensagem de e-mail
    $email_content = "Nome: $name\n";
    $email_content .= "Email: $email\n\n";
    $email_content .= "Assunto: $subject_form\n";
    $email_content .= "Mensagem:\n$message\n";

    // Cabeçalhos do e-mail. Essencial para que o e-mail não seja marcado como spam.
    // O 'From' será o e-mail da pessoa que preencheu o formulário.
    $headers = "From: $name <$email>\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";


    // --- Envio do E-mail ---
    // A função mail() do PHP é geralmente suficiente para a maioria dos provedores de hospedagem como a KingHost.
    if (mail($recipient_email, $subject, $email_content, $headers)) {
        // Se o e-mail for enviado com sucesso, redireciona com status de sucesso.
        header("Location: index.html#contato?status=success");
    } else {
        // Se falhar, redireciona com status de erro.
        header("Location: index.html#contato?status=error");
    }

} else {
    // Se alguém tentar acessar o arquivo enviar.php diretamente, redireciona para a página inicial.
    http_response_code(403);
    echo "Acesso proibido.";
}
?>
