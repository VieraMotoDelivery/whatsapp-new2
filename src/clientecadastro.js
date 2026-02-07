const { Requests } = require('./request.js');
const {
    desejacadastrarmaisnumeros,
    jacadastrouotoken,
    obrigadocadastroefetuadocomsucesso,
    naoexistenumerotelefonedessetamanho,
    naoesquecadoddd,
    verificarpropriedadenula,
} = require('./middlewares.js');
const { voltar } = require('./middlewares.js');

async function clientecadastro(msgNumber, msg, etapaRetrieve, client) {
    let message = msg.body.toLowerCase();
    if (msgNumber) {
        if (msg.body === msgNumber.codigo + '/registrar') {
            client.sendMessage(
                msg.from,
                `É necessário o preenchimento de algumas informações para o cadastro da empresa.

1 - Quero cadastrar o token.      
2 - Quero cadastrar ou editar os números de WhatsApp que poderão fazer o pedido de entrega em nome da empresa.`
            );
            Requests.updateEtapa(msg.from, {
                etapa: '1',
                codigo: msgNumber.codigo,
            });
        }
    }

    if (etapaRetrieve.etapa === '1') {
        voltar(msg.from, message, client);
        if (msg.body === '1') {
            client.sendMessage(
                msg.from,
                `Ok, agora nos informe o token por favor.

Lembrando que é através do token que nosso sistema entende o lugar de coleta da entrega.

Ex de resposta:
b395777131256287462da50f7e0a7656db39`
            );
            Requests.updateEtapa(msg.from, { etapa: '2' });
        }
        if (msg.body === '2') {
            client.sendMessage(
                msg.from,
                `Registre todos os números telefones que podem fazer o pedido por esse ChatBot.

Lembrando os numero cadastrado juntamente com o código da empresa pode efetuar um pedido de entrega.

Você pode cadastrar até 5 números, caso tenha menos não se preocupe, está tudo certo.

Nos envie na resposta um numero por vez!

Ex de resposta:
14981574852`
            );
            Requests.updateEtapa(msg.from, { etapa: '4' });
        }

        if (msg.body !== '1' && msg.body !== '2') {
            client.sendMessage(
                msg.from,
                `Desculpa, não consegui entender sua resposta.
  
Vamos tentar novamente, qual é a forma de pagamento ?

Por favor, escolha uma das opções ⬇️

1 - Quero cadastrar o token.      
2 - Quero cadastrar ou editar os números de WhatsApp que poderão fazer o pedido de entrega em nome da empresa.`
            );
        }
    }

    if (etapaRetrieve.etapa === '2') {
        voltar(msg.from, message, client);
        if (msg.body.length > 30) {
            Requests.updateClient(etapaRetrieve.codigo, { token: msg.body });
            Requests.updateEtapa(msg.from, { etapa: '3' });
            client.sendMessage(
                msg.from,
                `Obrigado, o token foi cadastrado com sucesso!

Você já cadastrou o numero de telefone ?

1 - Já cadastrei
2 - Ainda não cadastrei`
            );
        } else {
            client.sendMessage(
                msg.from,
                'O token está errado, copia e cole novamente.'
            );
        }
    }
    if (etapaRetrieve.etapa === '3') {
        voltar(msg.from, message, client);
        if (msg.body === '1') {
            obrigadocadastroefetuadocomsucesso(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: 'a' });
        }
        if (msg.body === '2') {
            client.sendMessage(
                msg.from,
                `Registre todos os números telefones que podem fazer o pedido por esse ChatBot.
    
Lembrando os numero telefones cadastrado juntamente com o código da empresa pode efetuar um pedido de entrega.

Você pode cadastrar até 5 números, caso tenha menos não se preocupe, está tudo certo.

Nos envie na resposta um numero por vez!

Ex de resposta:
14981574852`
            );
            Requests.updateEtapa(msg.from, { etapa: '20' });
        }
    }
    // ----------------Quero cadastrar o token, não precisa pergunta se já cadastrou!----------------------------------------------------------------
    if (etapaRetrieve.etapa === '20') {
        voltar(msg.from, message, client);
        if (msg.body.length === 11 || msg.body.length === 10) {
            const response = await Requests.retrieveClient(
                etapaRetrieve.codigo
            );
            const objetoPronto = verificarpropriedadenula(response, msg.body);

            if (
                objetoPronto == 'Todos os campos de telefone foram preenchidos'
            ) {
                client.sendMessage(msg.from, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: 'a' });
            } else {
                Requests.updateEtapa(msg.from, { etapa: '21' });
                Requests.updateClient(etapaRetrieve.codigo, objetoPronto);

                desejacadastrarmaisnumeros(client, msg.from);
            }
        } else if (msg.body.length > 11) {
            naoexistenumerotelefonedessetamanho(client, msg.from);
        } else if (msg.body.length < 10 && msg.body !== '1') {
            naoesquecadoddd(client, msg.from);
        }
    }

    if (etapaRetrieve.etapa === '21') {
        voltar(msg.from, message, client);
        if (msg.body === '1') {
            obrigadocadastroefetuadocomsucesso(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: 'a' });
        }

        if (msg.body.length === 11 || msg.body.length === 10) {
            const response = await Requests.retrieveClient(
                etapaRetrieve.codigo
            );
            const objetoPronto = verificarpropriedadenula(response, msg.body);
            if (
                objetoPronto == 'Todos os campos de telefone foram preenchidos'
            ) {
                client.sendMessage(msg.from, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: 'a' });
            } else {
                Requests.updateEtapa(msg.from, { etapa: '22' });
                Requests.updateClient(etapaRetrieve.codigo, objetoPronto);
                desejacadastrarmaisnumeros(client, msg.from);
            }
        } else if (msg.body.length > 11) {
            naoexistenumerotelefonedessetamanho(client, msg.from);
        } else if (msg.body.length < 10 && msg.body !== '1') {
            naoesquecadoddd(client, msg.from);
        }
    }
    if (etapaRetrieve.etapa === '22') {
        voltar(msg.from, message, client);
        if (msg.body === '1') {
            obrigadocadastroefetuadocomsucesso(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: 'a' });
        }

        if (msg.body.length === 11 || msg.body.length === 10) {
            const response = await Requests.retrieveClient(
                etapaRetrieve.codigo
            );
            const objetoPronto = verificarpropriedadenula(response, msg.body);
            if (
                objetoPronto == 'Todos os campos de telefone foram preenchidos'
            ) {
                client.sendMessage(msg.from, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: 'a' });
            } else {
                Requests.updateClient(etapaRetrieve.codigo, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: '23' });

                desejacadastrarmaisnumeros(client, msg.from);
            }
        } else if (msg.body.length > 11) {
            naoexistenumerotelefonedessetamanho(client, msg.from);
        } else if (msg.body.length < 10 && msg.body !== '1') {
            naoesquecadoddd(client, msg.from);
        }
    }
    if (etapaRetrieve.etapa === '23') {
        voltar(msg.from, message, client);
        if (msg.body === '1') {
            obrigadocadastroefetuadocomsucesso(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: 'a' });
        }

        if (msg.body.length === 11 || msg.body.length === 10) {
            const response = await Requests.retrieveClient(
                etapaRetrieve.codigo
            );
            const objetoPronto = verificarpropriedadenula(response, msg.body);
            if (
                objetoPronto == 'Todos os campos de telefone foram preenchidos'
            ) {
                client.sendMessage(msg.from, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: 'a' });
            } else {
                Requests.updateClient(etapaRetrieve.codigo, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: '24' });

                desejacadastrarmaisnumeros(client, msg.from);
            }
        } else if (msg.body.length > 11) {
            naoexistenumerotelefonedessetamanho(client, msg.from);
        } else if (msg.body.length < 10 && msg.body !== '1') {
            naoesquecadoddd(client, msg.from);
        }
    }

    if (etapaRetrieve.etapa === '24') {
        voltar(msg.from, message, client);
        if (msg.body === '1') {
            obrigadocadastroefetuadocomsucesso(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: 'a' });
        }

        if (msg.body.length === 11 || msg.body.length === 10) {
            const response = await Requests.retrieveClient(
                etapaRetrieve.codigo
            );
            const objetoPronto = verificarpropriedadenula(response, msg.body);
            if (
                objetoPronto == 'Todos os campos de telefone foram preenchidos'
            ) {
                client.sendMessage(msg.from, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: 'a' });
            } else {
                Requests.updateClient(etapaRetrieve.codigo, objetoPronto);
                desejacadastrarmaisnumeros(client, msg.from);
            }
        } else if (msg.body.length > 11) {
            naoexistenumerotelefonedessetamanho(client, msg.from);
        } else if (msg.body.length < 10 && msg.body !== '1') {
            naoesquecadoddd(client, msg.from);
        }
    }
    // -----------Quero cadastrar ou editar os números de WhatsApp, precisa pergunta se já cadastrou o token----
    if (etapaRetrieve.etapa === '4') {
        voltar(msg.from, message, client);
        if (msg.body.length === 11 || msg.body.length === 10) {
            const response = await Requests.retrieveClient(
                etapaRetrieve.codigo
            );
            const objetoPronto = verificarpropriedadenula(response, msg.body);
            if (
                objetoPronto == 'Todos os campos de telefone foram preenchidos'
            ) {
                client.sendMessage(msg.from, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: 'a' });
            } else {
                Requests.updateClient(etapaRetrieve.codigo, objetoPronto);

                Requests.updateEtapa(msg.from, { etapa: '5' });

                desejacadastrarmaisnumeros(client, msg.from);
            }
        } else if (msg.body.length > 11) {
            naoexistenumerotelefonedessetamanho(client, msg.from);
        } else if (msg.body.length < 10 && msg.body !== '1') {
            naoesquecadoddd(client, msg.from);
        }
    }

    if (etapaRetrieve.etapa === '5') {
        voltar(msg.from, message, client);
        if (msg.body === '1') {
            jacadastrouotoken(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: '10' });
        }

        if (msg.body.length === 11 || msg.body.length === 10) {
            const response = await Requests.retrieveClient(
                etapaRetrieve.codigo
            );
            const objetoPronto = verificarpropriedadenula(response, msg.body);

            if (
                objetoPronto == 'Todos os campos de telefone foram preenchidos'
            ) {
                client.sendMessage(msg.from, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: 'a' });
            } else {
                Requests.updateClient(etapaRetrieve.codigo, objetoPronto);

                Requests.updateEtapa(msg.from, { etapa: '6' });

                desejacadastrarmaisnumeros(client, msg.from);
            }
        } else if (msg.body.length > 11) {
            naoexistenumerotelefonedessetamanho(client, msg.from);
        } else if (msg.body.length < 10 && msg.body !== '1') {
            naoesquecadoddd(client, msg.from);
        }
    }
    if (etapaRetrieve.etapa === '6') {
        voltar(msg.from, message, client);
        if (msg.body === '1') {
            jacadastrouotoken(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: '10' });
        }

        if (msg.body.length === 11 || msg.body.length === 10) {
            const response = await Requests.retrieveClient(
                etapaRetrieve.codigo
            );
            const objetoPronto = verificarpropriedadenula(response, msg.body);
            if (
                objetoPronto == 'Todos os campos de telefone foram preenchidos'
            ) {
                client.sendMessage(msg.from, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: 'a' });
            } else {
                Requests.updateClient(etapaRetrieve.codigo, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: '7' });

                desejacadastrarmaisnumeros(client, msg.from);
            }
        } else if (msg.body.length > 11) {
            naoexistenumerotelefonedessetamanho(client, msg.from);
        } else if (msg.body.length < 10 && msg.body !== '1') {
            naoesquecadoddd(client, msg.from);
        }
    }
    if (etapaRetrieve.etapa === '7') {
        voltar(msg.from, message, client);
        if (msg.body === '1') {
            jacadastrouotoken(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: '10' });
        }

        if (msg.body.length === 11 || msg.body.length === 10) {
            const response = await Requests.retrieveClient(
                etapaRetrieve.codigo
            );
            const objetoPronto = verificarpropriedadenula(response, msg.body);
            if (
                objetoPronto == 'Todos os campos de telefone foram preenchidos'
            ) {
                client.sendMessage(msg.from, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: 'a' });
            } else {
                Requests.updateClient(etapaRetrieve.codigo, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: '8' });

                desejacadastrarmaisnumeros(client, msg.from);
            }
        } else if (msg.body.length > 11) {
            naoexistenumerotelefonedessetamanho(client, msg.from);
        } else if (msg.body.length < 10 && msg.body !== '1') {
            naoesquecadoddd(client, msg.from);
        }
    }

    if (etapaRetrieve.etapa === '8') {
        voltar(msg.from, message, client);
        if (msg.body === '1') {
            jacadastrouotoken(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: '10' });
        }

        if (msg.body.length === 11 || msg.body.length === 10) {
            const response = await Requests.retrieveClient(
                etapaRetrieve.codigo
            );
            const objetoPronto = verificarpropriedadenula(response, msg.body);
            if (
                objetoPronto == 'Todos os campos de telefone foram preenchidos'
            ) {
                client.sendMessage(msg.from, objetoPronto);
                Requests.updateEtapa(msg.from, { etapa: 'a' });
            } else {
                Requests.updateClient(etapaRetrieve.codigo, objetoPronto);

                desejacadastrarmaisnumeros(client, msg.from);
            }
        } else if (msg.body.length > 11) {
            naoexistenumerotelefonedessetamanho(client, msg.from);
        } else if (msg.body.length < 10 && msg.body !== '1') {
            naoesquecadoddd(client, msg.from);
        }
    }

    // --------------------Já cadastrou o token?----------------------------------------------------
    if (etapaRetrieve.etapa === '10') {
        voltar(msg.from, message, client);
        if (msg.body === '1') {
            obrigadocadastroefetuadocomsucesso(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: 'a' });
        }

        if (msg.body === '2') {
            client.sendMessage(
                msg.from,
                `Ok, agora nos informe o token por favor.

Lembrando que é através do token que nosso sistema entende o lugar de coleta da entrega.

Ex de resposta:
b395777131256287462da50f7e0a7656db39`
            );

            Requests.updateEtapa(msg.from, { etapa: '11' });
        }
    }

    if (etapaRetrieve.etapa === '11') {
        voltar(msg.from, message, client);
        if (msg.body.length > 30) {
            Requests.updateClient(etapaRetrieve.codigo, { token: msg.body });
            Requests.updateEtapa(msg.from, { etapa: 'a' });

            obrigadocadastroefetuadocomsucesso(client, msg.from);
        } else {
            client.sendMessage(
                msg.from,
                'O token está errado, copia e cole novamente.'
            );
        }
    }
}

module.exports = { clientecadastro };
