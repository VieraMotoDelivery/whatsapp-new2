const { Requests } = require('./request.js');
const { voltar } = require('./middlewares.js');

async function sosregistrarcodigo(msg, etapaRetrieve, client) {
    let message = msg.body.toLowerCase();
    if (message === '/registrar/.' && etapaRetrieve.etapa === 'a') {
        client.sendMessage(msg.from, 'Digite o código.');

        Requests.updateEtapa(msg.from, { etapa: 'x' });
    }

    if (etapaRetrieve.etapa === 'x') {
        voltar(msg.from, message, client);
        if (msg.body.length === 3) {
            try {
                await Requests.createClient({ codigo: msg.body });

                Requests.updateEtapa(msg.from, { etapa: 'y', codigo: msg.body });
                client.sendMessage(msg.from, 'Digite o nome do cliente');
            } catch (error) {
                client.sendMessage(
                    msg.from,
                    'Já existe um cliente cadastrado com esse código.'
                );
            }
        }
        if (
            message !== 'voltar' &&
      message !== 'cancela' &&
      message !== 'cancelar' &&
      msg.body.length !== 3
        ) {
            client.sendMessage(msg.from, 'O código precisa ser de 3 digitos.');
        }
    }

    if (etapaRetrieve.etapa === 'y') {
        voltar(msg.from, message, client);
        if (
            message !== 'voltar' &&
      message !== 'cancela' &&
      message !== 'cancelar'
        ) {
            Requests.updateClient(etapaRetrieve.codigo, { nome: msg.body });
            Requests.updateEtapa(msg.from, { etapa: 'a' });
            client.sendMessage(msg.from, 'Cliente cadastrado com sucesso.');
        }
    }
}

module.exports = { sosregistrarcodigo };
