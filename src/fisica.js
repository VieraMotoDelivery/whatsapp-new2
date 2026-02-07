const { Requests } = require('./request.js');
const {
    voltarFisica,
    digiteoenderecodecoleta,
    checkingAddress,
    temalgumaobservacaofisica,
    obrigadoseupedidofoifeitocomsucesso,
} = require('./middlewares.js');

// msgNumber = Dados do cliente
// etapaRetrieve = verifica se é numero privado e retorna a etapa
// codigotelefone = verifica se o numero enviado é igual ao numero de telefone cadastrado do código

async function fisica(msg, etapaRetrieve, client) {
    let message = msg.body.toLowerCase();
    if (etapaRetrieve.etapa == 'a') {
        client.sendMessage(
            msg.from,
            `Olá! 😃
Eu sou o Assistente Virtual do *Viera Entregas* e estou aqui para te ajudar. Oque você deseja nesse momento ?

Digite apenas o numero da opção.
⬇️

*1* - Solicitar um motoboy para fazer um, *pedido de entrega / ou consultar valores.*

*2* - Falar com um representante sobre; *vaga de emprego, parceria com estabelecimento, ou outros assuntos?*`
        );
        Requests.updateEtapa(msg.from, { etapa: 'b' });
    }

    if (etapaRetrieve.etapa == 'b') {
        voltarFisica(msg.from, message, client);
        if (msg.body == '1') {
            client.sendMessage(
                msg.from,
                `Segue os valores, favor selecionar a opção que se enquadra no seu ponto de coleta com o lugar entrega.

1 - Barra x Barra 9,00
2 - Barra x Igaraçu 10,00
3 - Cohab da Barra pra cima x Igaraçu 14,00

4 - Igaraçu x Igaraçu 8,00
5 - Igaraçu x Barra 10,00
6 - Igaraçu x Cohab da Barra pra cima 14,00

7 - Áreas Rurais, chácaras e condomínio Solicitar Consulta`
            );

            client.sendMessage(
                msg.from,
                'Se em algum momento você errar na hora de fazer o pedido, basta digitar *VOLTAR*'
            );
            Requests.updateEtapa(msg.from, { etapa: 'c' });
        }

        if (msg.body == '2') {
            let telefone = msg.from.slice(2, 13);
            client.sendMessage(
                msg.from,
                'Agradecemos por entrar em contato conosco. Pedimos que aguarde um minuto, pois um de nossos representantes estará prontamente disponível para atendê-lo. '
            );
            //             CRIS
            //             client.sendMessage("5514988088702@c.us", `${telefone}`);
            //             client.sendMessage(
            //                "5514988088702@c.us",
            //                `Atenção! Temos um cliente aguardando para falar com um de nossos representantes.

            // O chatbot foi desativado temporariamente. Por favor, não se esqueça de reativá-lo após o término da conversa, para que o cliente possa continuar a receber assistência automatizada.`
            //            );
            

            Requests.updateEtapa(msg.from, { ativado: false, etapa: 'des' });
        } else if (
            msg.body != '1' &&
            msg.body != '2' &&
            message !== 'voltar' &&
            message !== 'cancela' &&
            message !== 'cancelar'
        ) {
            client.sendMessage(
                msg.from,
                `Desculpa, não consegui entender sua resposta.

Vamos tentar novamente. Oque você deseja nesse momento ?

Por favor, escolha uma das opções, digite apenas o numero. ⬇️

*1* - Solicitar um motoboy para fazer um, *pedido de entrega / ou consultar valores.*

*2* - Falar com um representante sobre; *vaga de emprego, parceria com estabelecimento, ou outros assuntos?*`
            );
        }
    }

    if (etapaRetrieve.etapa == 'c') {
        voltarFisica(msg.from, message, client);
        if (msg.body == '1') {
            digiteoenderecodecoleta(msg.from, client);
            Requests.createEntregaEmpresa({
                telefone: msg.from,
                obs: 'Barra x Barra',
                codigo: '500',
            });
            Requests.updateEtapa(msg.from, { etapa: 'd' });
        }
        if (msg.body == '2') {
            digiteoenderecodecoleta(msg.from, client);
            Requests.createEntregaEmpresa({
                telefone: msg.from,
                obs: 'Barra x Igaraçu',
                codigo: '500',
            });
            Requests.updateEtapa(msg.from, { etapa: 'd' });
        }
        if (msg.body == '3') {
            digiteoenderecodecoleta(msg.from, client);
            Requests.createEntregaEmpresa({
                telefone: msg.from,
                obs: 'Cohab da Barra pra cima x Igaraçu',
                codigo: '500',
            });
            Requests.updateEtapa(msg.from, { etapa: 'd' });
        }
        if (msg.body == '4') {
            digiteoenderecodecoleta(msg.from, client);
            Requests.createEntregaEmpresa({
                telefone: msg.from,
                obs: 'Igaraçu x Igaraçu',
                codigo: '500',
            });
            Requests.updateEtapa(msg.from, { etapa: 'd' });
        }
        if (msg.body == '5') {
            digiteoenderecodecoleta(msg.from, client);
            Requests.createEntregaEmpresa({
                telefone: msg.from,
                obs: 'Igaraçu x Barra',
                codigo: '500',
            });
            Requests.updateEtapa(msg.from, { etapa: 'd' });
        }
        if (msg.body == '6') {
            digiteoenderecodecoleta(msg.from, client);
            Requests.createEntregaEmpresa({
                telefone: msg.from,
                obs: 'Igaraçu x Cohab da Barra pra cima',
                codigo: '500',
            });
            Requests.updateEtapa(msg.from, { etapa: 'd' });
        }
        if (msg.body == '7') {
            digiteoenderecodecoleta(msg.from, client);

          

            // client.sendMessage(
            //     "5514988088702@c.us",
            //     `Atenção, o cliente escolheu a opção ÁREAS RURAIS. Passe o valor da corrida para ele.`
            // );

            await Requests.updateEtapa(msg.from, { etapa: '40' });
            Requests.createEntregaEmpresa({
                telefone: msg.from,
                obs: 'Áreas Rurais, chácaras e condomínio',
                codigo: '500',
            });



        } else if (
            msg.body != '1' &&
            msg.body != '2' &&
            msg.body != '3' &&
            msg.body != '4' &&
            msg.body != '5' &&
            msg.body != '6' &&
            msg.body != '7' &&
            message !== 'voltar' &&
            message !== 'cancela' &&
            message !== 'cancelar'
        ) {
            client.sendMessage(
                msg.from,
                `Desculpa, não consegui entender sua resposta.

Vamos tentar novamente. Qual se enquadra no seu ponto de coleta com o lugar da entrega ?

Por favor, escolha uma das opções ⬇️

1 - Barra x Barra 9,00
2 - Barra x Igaraçu 10,00
3 - Cohab da Barra pra cima x Igaraçu 14,00

4 - Igaraçu x Igaraçu 8,00
5 - Igaraçu x Barra 10,00
6 - Igaraçu x Cohab da Barra pra cima 14,00

7 - Áreas Rurais, chácaras e condomínio Solicitar Consulta`
            );
        }
    }

    if (etapaRetrieve.etapa == 'd') {
        voltarFisica(msg.from, message, client);
        const address = checkingAddress(msg);
        if (address) {
            client.sendMessage(
                msg.from,
                `Uhuul 😁
Agora digite o endereço de *ENTREGA* por favor.

Precisamos que seja TUDO NA MESMA LINHA:
        
*RUA, NUMERO DA CASA E NOME DA CIDADE*`
            );

            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                obs: msg.body + ' sp',
                b: 'b',
            });
            Requests.updateEtapa(msg.from, { etapa: 'e' });
        } else if (
            !address &&
            message !== 'voltar' &&
            message !== 'cancela' &&
            message !== 'cancelar'
        ) {
            client.sendMessage(
                msg.from,
                `Atenção ⚠️
Alguma informação pode estar errada... *tente novamente segundo os requisitos abaixo ⬇️

NOME DA RUA, NUMERO DA CASA, CIDADE SE É BARRA BONITA OU IGARAÇU DO TIETE 🏘️

TUDO NA MESMA LINHA`
            );
        }
    }

    if (etapaRetrieve.etapa == 'e') {
        voltarFisica(msg.from, message, client);
        const address = checkingAddress(msg);
        if (address) {
            client.sendMessage(
                msg.from,
                `Sobre o pagamento, escolha uma das alternativas. _*Atenção*_: Não temos máquina de cartão e o motoboy não fornece troco!⬇️

*1* - O produto já está pago e a entrega vai ser paga no *Pix (preferencialmente)!*🏦

*2* - O produto já está pago e a entrega vai ser paga em *dinheiro!*💵

*3* - Darei o valor do produto ao motoboy, para ele pagar. *E a entrega em dinheiro!*💵

*4* - Darei o valor do produto ao motoboy pra ele pagar. *E da entrega farei pix!*🏦`
            );

            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                entrega: msg.body + ' sp',
            });
            Requests.updateEtapa(msg.from, { etapa: 'f' });
        } else if (
            !address &&
            message !== 'voltar' &&
            message !== 'cancela' &&
            message !== 'cancelar'
        ) {
            client.sendMessage(
                msg.from,
                `Atenção ⚠️
Alguma informação pode estar errada... *tente novamente segundo os requisitos abaixo ⬇️

NOME DA RUA, NUMERO DA CASA, CIDADE SE É BARRA BONITA OU IGARAÇU DO TIETE 🏘️

TUDO NA MESMA LINHA`
            );
        }
    }

    if (etapaRetrieve.etapa == 'f') {
        voltarFisica(msg.from, message, client);
        if (msg.body == '1') {
            temalgumaobservacaofisica(msg.from, client);
            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                obs: 'O produto já está pago e a entrega vai ser paga no pix',
                formadepagamento: 'pix',
                b: 'b',
            });
            Requests.updateEtapa(msg.from, { etapa: 'h' });
        }
        if (msg.body == '2') {
            temalgumaobservacaofisica(msg.from, client);
            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                obs: 'O produto já está pago e a entrega vai ser paga em dinheiro!',
                formadepagamento: 'money',
                b: 'b',
            });
            Requests.updateEtapa(msg.from, { etapa: 'h' });
        }
        if (msg.body == '3') {
            temalgumaobservacaofisica(msg.from, client);
            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                obs: 'Darei o valor do produto ao motoboy, para ele pagar. E a entrega em dinheiro!',
                formadepagamento: 'money',
                b: 'b',
            });
            Requests.updateEtapa(msg.from, { etapa: 'h' });
        }
        if (msg.body == '4') {
            temalgumaobservacaofisica(msg.from, client);
            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                obs: 'Darei o valor do produto ao motoboy pra ele pagar. E da entrega farei pix!',
                formadepagamento: 'pix',
                b: 'b',
            });
            Requests.updateEtapa(msg.from, { etapa: 'h' });
        } else if (
            msg.body != '1' &&
            msg.body != '2' &&
            msg.body != '3' &&
            msg.body != '4' &&
            message !== 'voltar'
        ) {
            client.sendMessage(
                msg.from,
                `Desculpa, não consegui entender sua resposta.

Vamos tentar novamente. Sobre o pagamento, escolha uma das alternativas. _*Atenção*_: Não temos máquina de cartão e o motoboy não fornece troco!⬇️

*1* - O produto já está pago e a entrega vai ser paga no *Pix (preferencialmente)!*🏦

*2* - O produto já está pago e a entrega vai ser paga em *dinheiro!*💵

*3* - Darei o valor do produto ao motoboy, para ele pagar. *E a entrega em dinheiro!*💵

*4* - Darei o valor do produto ao motoboy pra ele pagar. *E da entrega farei pix!*🏦`
            );
        }
    }

    if (etapaRetrieve.etapa == 'h') {
        voltarFisica(msg.from, message, client);
        if (
            message !== 'voltar' &&
            message !== 'cancela' &&
            message !== 'cancelar'
        ) {
            let mensagem = msg.body.slice(0, 5);

            if (mensagem == 'BEGIN') {
                client.sendMessage(
                    msg.from,
                    `Atenção ⚠️
                   
Sua observação é invalida! Escreva sua observação e nos envie.`
                );
            } else {
                if (msg.body.length <= 300) {
                    let numero = msg.from.slice(2, -5);
                    try {
                        const response = await Requests.updateEntregaEmpresa({
                            telefone: msg.from,
                            obs: `Obs: ${msg.body} - Telefone: ${numero}`,
                            b: 'b',
                        });

                        obrigadoseupedidofoifeitocomsucesso(msg.from, client, response);
                    } catch (error) {
                        console.log('DEU ERRO NA REQUISIÇÃO - 1');
                    }
                } else {
                    client.sendMessage(
                        msg.from,
                        `Atenção ⚠️
                       
Sua observação deve conter menos que 300 caracteres, resuma ao máximo por favor.

Obrigado pela compreensão!!!`
                    );
                }
            }
        }
    }

    // ---------------------ZONAS RURAIS------------------------------------------------
    if (etapaRetrieve.etapa == '40') {
        voltarFisica(msg.from, message, client);
        const address = checkingAddress(msg);
        if (address) {
            client.sendMessage(
                msg.from,
                `Uhuul 😁
Agora digite o endereço de *ENTREGA* por favor.

Precisamos que seja TUDO NA MESMA LINHA:
        
*RUA, NUMERO DA CASA E NOME DA CIDADE*`
            );

            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                obs: msg.body + ' sp',
                b: 'b',
            });
            Requests.updateEtapa(msg.from, { etapa: '41' });
        } else if (
            !address &&
            message !== 'voltar' &&
            message !== 'cancela' &&
            message !== 'cancelar'
        ) {
            client.sendMessage(
                msg.from,
                `Atenção ⚠️
Alguma informação pode estar errada... *tente novamente segundo os requisitos abaixo ⬇️

NOME DA RUA, NUMERO DA CASA, CIDADE SE É BARRA BONITA OU IGARAÇU DO TIETE 🏘️

TUDO NA MESMA LINHA`
            );
        }
    }

    if (etapaRetrieve.etapa == '41') {
        voltarFisica(msg.from, message, client);
        const address = checkingAddress(msg);
        if (address) {
            Requests.updateEtapa(msg.from, { etapa: '42' });
            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                entrega: msg.body + ' sp',
            });
            client.sendMessage(
                msg.from,
                `Neste momento, estamos realizando a consulta do valor da entrega para você. Pedimos que aguarde um momento enquanto
buscamos essa informação em nosso sistema. Estamos empenhados em fornecer-lhe uma resposta precisa e rápida.`
            );

            // CRIS
            //             client.sendMessage(
            //                 "5514988088702@c.us",
            //                 `Você deseja finalizar o pedido de entrega ?

            // Escolha por favor uma das opções

            // *1* - Sim, desejo continuar
            // *2* - Não.`
            //             );
            // client.sendMessage(
            //     "5514988088702@c.us",
            //     `Atenção! Temos um cliente aguardando para consultar o valor da entrega.`
            // );

           
        } else if (
            !address &&
            message !== 'voltar' &&
            message !== 'cancela' &&
            message !== 'cancelar'
        ) {
            client.sendMessage(
                msg.from,
                `Atenção ⚠️
Alguma informação pode estar errada... *tente novamente segundo os requisitos abaixo ⬇️

NOME DA RUA, NUMERO DA CASA, CIDADE SE É BARRA BONITA OU IGARAÇU DO TIETE 🏘️

TUDO NA MESMA LINHA`
            );
        }
    }

    if (etapaRetrieve.etapa == '42') {
        voltarFisica(msg.from, message, client);
        if (msg.body == '1') {
            client.sendMessage(
                msg.from,
                `Sobre o pagamento, escolha uma das alternativas. _*Atenção*_: Não temos máquina de cartão e o motoboy não fornece troco!⬇️

*1* - O produto já está pago e a entrega vai ser paga no *Pix (preferencialmente)!*🏦

*2* - O produto já está pago e a entrega vai ser paga em *dinheiro!*💵

*3* - Darei o valor do produto ao motoboy, para ele pagar. *E a entrega em dinheiro!*💵

*4* - Darei o valor do produto ao motoboy pra ele pagar. *E da entrega farei pix!*🏦`
            );
            Requests.updateEtapa(msg.from, { etapa: 'f' });
        }
        if (msg.body == '2') {
            client.sendMessage(
                msg.from,
                `Ok, mesmo assim agradecemos pelo seu contato

Até a próxima! Tenha um ótimo dia!`
            );
            Requests.updateEtapa(msg.from, { etapa: 'a' });
            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                msgwhats: true,
            });
        }

        if (
            msg.body != '1' &&
            msg.body != '2' &&
            message !== 'voltar' &&
            message !== 'cancela' &&
            message !== 'cancelar'
        ) {
            client.sendMessage(
                msg.from,
                `Desculpa, não consegui entender sua resposta.

Vamos tentar novamente. Você deseja mesmo assim finalizar o pedido de entrega ?

Por favor, escolha uma das opções ⬇️

*1* - Sim, desejo continuar
*2* - Não.`
            );
        }
    }

    // ---------------COMPROVANTE---------------
    if (etapaRetrieve.etapa == 'compr' && msg.mediaKey != undefined) {
        client.sendMessage(
            msg.from,
            `Obrigado por nos enviar o comprovante!
    
Agradecemos pela sua colaboração e confiança em nossos serviços.

Ficamos satisfeitos em poder atendê-lo(a) e tornar essa entrega possível. 😃`
        );
        Requests.updateEtapa(msg.from, { etapa: 'a' });

        // CRIS
        //         client.sendMessage(
        //             "5514988088702@c.us",
        //             `Comprovante de pagamento foi enviado!
        // Numero telefone do cliente: ${msg.from}`
        //         );

        //         client.sendMessage("5514988088702@c.us", msg.body);
    }
}

module.exports = { fisica };
