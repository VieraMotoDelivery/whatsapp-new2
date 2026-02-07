const { Requests } = require('./request.js');
const { checkingAddress, temalgumaobservacao } = require('./middlewares.js');
const { voltarEmpresa } = require('./middlewares.js');

// msgNumber = Dados do cliente
// etapaRetrieve = verifica se é numero privado e retorna a etapa
// codigotelefone = verifica se o numero enviado é igual ao numero de telefone cadastrado do código


async function empresa(msg, msgNumber, etapaRetrieve, codigotelefone, client) {
    let message = msg.body.toLowerCase();

    if (!codigotelefone && !msgNumber && etapaRetrieve.etapa === 'a') {
        client.sendMessage(msg.from, 'Digite o código corretamente');
    }
    const a = msg.body.charAt(3);
    if (codigotelefone && etapaRetrieve.etapa === 'a' && a !== '/') {
        client.sendMessage(
            msg.from,
            `Olá *${msgNumber.nome}*, bora fazer mais um pedido de entrega ?!😁

Digite o endereço de *ENTREGA* por favor.
        
Precisamos que seja TUDO NA MESMA LINHA:
        
*RUA, NUMERO DA CASA E NOME DA CIDADE*`
        );
        Requests.updateEtapa(msg.from, { etapa: 'b' });
        Requests.createEntregaEmpresa({
            telefone: msg.from,
            tokencoleta: msgNumber.token,
            codigo: msg.body,
        });
    }

    if (etapaRetrieve.etapa === 'b') {
        voltarEmpresa(msg.from, message, client);
        const address = checkingAddress(msg);

        if (address) {
            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                entrega: msg.body,
            });
            client.sendMessage(
                msg.from,
                `Qual é a forma de pagamento ?
  
*1* - Cartão
*2* - Dinheiro
*3* - Pago, Pix, Pagamento online`
            );
            Requests.updateEtapa(msg.from, { etapa: 'c' });
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

    if (etapaRetrieve.etapa === 'c') {
        voltarEmpresa(msg.from, message, client);
        let um = msg.body.includes('1');
        let dois = msg.body.includes('2');
        let tres = msg.body.includes('3');
        if (um) {
            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                formadepagamento: 'card',
            });
            temalgumaobservacao(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: 'd' });
        }
        if (dois) {
            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                formadepagamento: 'money',
            });
            temalgumaobservacao(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: 'd' });
        }

        if (tres) {
            Requests.updateEntregaEmpresa({
                telefone: msg.from,
                formadepagamento: 'pix',
            });
            temalgumaobservacao(client, msg.from);
            Requests.updateEtapa(msg.from, { etapa: 'd' });
        }

        if (
            !um &&
            !dois &&
            !tres &&
            message !== 'voltar' &&
            message !== 'cancela' &&
            message !== 'cancelar'
        ) {
            client.sendMessage(
                msg.from,
                `Desculpa, não consegui entender sua resposta.
  
Vamos tentar novamente, qual é a forma de pagamento ?

Por favor, escolha uma das opções ⬇️

*1* - Cartão
*2* - Dinheiro
*3* - Pago, Pix, Pagamento online`
            );
        }
    }

    if (etapaRetrieve.etapa === 'd') {
        voltarEmpresa(msg.from, message, client);
        if (
            message !== 'voltar' &&
            message !== 'cancela' &&
            message !== 'cancelar'
        ) {
            const response = await Requests.updateEntregaEmpresa({
                telefone: msg.from,
                obs: msg.body,
            });

            if (response.formadepagamento == '') {
                client.sendMessage(
                    msg.from,
                    'Digite o numero(código) novamente por favor!'
                );
                Requests.updateEtapa(msg.from, { etapa: 'a' });
            } else if (response.formadepagamento != '') {
                try {
                    const data = {
                        id: response.id,
                        status: 'open',
                        paymentMethod: response.formadepagamento,
                        notes: response.obs,
                        deliveryPoint: {
                            address: response.entrega,
                        },
                    };

                    const responseFood = await fetch(
                        'https://app.foodydelivery.com/rest/1.2/orders',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: response.tokencoleta,
                            },
                            body: JSON.stringify(data),
                        }
                    )
                        .then((res) => res.json())
                        .then((res) => res)
                        .catch((err) => console.log(err));

                    if (responseFood.errorCode) {
                        client.sendMessage(
                            msg.from,
                            'Ouve uma falha no lançamento da entrega, tente novamente começando do início ⚠️'
                        );
                        Requests.updateEtapa(msg.from, { etapa: 'a' });

                    } else {
                        const dados = {
                            telefone: msg.from,
                            iddatabase: response.id,
                            entrega: response.entrega,
                            entregaidfood: responseFood.uid,
                        };

                        fetch('https://db-viera.up.railway.app/webhook/create', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(dados),
                        })
                            .then((res) => res.json())
                            .then((res) => res)
                            .catch((err) => console.log(err));

                        client.sendMessage(
                            msg.from,
                            `Obrigado, seu pedido foi feito com sucesso! 😁
              
Assim que um de nossos entregadores aceitar seu pedido você será notificado.

Lembrando que coletas são de 0 a 15 minutos em dias normais.

*Numero do pedido:* ${response.id}
*Endereço de entrega:* ${response.entrega}
*Observação:* ${response.obs}`
                        );

                        Requests.updateEtapa(msg.from, { etapa: 'a' });
                    }
                } catch (error) {
                    console.log('DEU ERRO NA REQUISIÇÃO - 20');
                    Requests.updateEtapa(msg.from, { etapa: 'a' });
                    client.sendMessage(
                        msg.from,
                        `Ouve um problema, por favor refaça seu pedido novamente! ⚠️
Obrigado pela compreensão.`
                    );
                }
            }
        }
    }
}

module.exports = { empresa };