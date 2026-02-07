const { api } = require('./api');

class Requests {
    static async createClient(body) {
        try {
            const response = await api.post('/clientes', body);
            return response;
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 2');
        }
    }

    static async updateClient(codigo, body) {
        try {
            await api.patch(`/clientes/${codigo}`, body);
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 3');
        }
    }

    static async retrieveClient(codigo) {
        try {
            let response = await api.get(`/clientes/${codigo}`);
            return response.data;
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 4');
        }
    }

    static async listAllClient() {
        try {
            let response = await api.get('/clientes');
            return response.data;
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 5');
        }
    }

    static async deleteClient(codigo) {
        try {
            let response = await api.delete(`/clientes/${codigo}`);
            return response.data;
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 6');
        }
    }

    static async retrieveEtapa(msg) {
        try {
            let final = msg.from.slice(msg.from.length - 4);
            let isLid = msg.from.includes('@lid');
            // Aceitar tanto c.us (números) quanto @lid (dispositivos vinculados)
            if (final === 'c.us' || isLid) {
                let responseRetrieve = await api.get(`/etapas/${msg.from}`);

                if (responseRetrieve.data === null) {
                    let responsePost = await api.post('/etapas', {
                        telefone: msg.from,
                        etapa: 'a',
                        ativado: true
                    });

                    return responsePost.data;
                }
                return responseRetrieve.data;
            }
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 7', error.message);
        }
    }

    static async updateEtapa(from, body) {
        try {
            const response = await api.patch(`/etapas/${from}`, body);
            return response.data;
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 8');
        }
    }

    static async createEntregaEmpresa(data) {
        try {
            await api.post('/entregas', data);
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 9');
        }
    }

    static async updateEntregaEmpresa(data) {
        try {
            let response = await api.patch('/entregas', data);
            return response.data;
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 10');
        }
    }

    static async listEntregasEmpresa(data, from, client) {
        try {
            let response = await api.get(`/entregas/${data}`);

            let texto = '';
            for (let dados of response.data) {
                texto += `
----------------------
Entrega: ${dados.id}
Endereço: ${dados.entrega ? dados.entrega : 'Sem registro'}
Obs: ${dados.obs ? dados.obs : 'Sem registro'}
Pagamento: ${dados.formadepagamento ? dados.formadepagamento : 'Sem registro'}`;
            }
            client.sendMessage(from, texto);

            return response.data.length;
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 11');
        }
    }

    static async listarQuantidadeDeEntregasDeUmaEmpresa(codigo) {
        try {
            let response = await api.get(`/entregas/company/${codigo}`);
            return response.data;
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 12');
        }
    }

    static async requestCronJob() {
        try {
            let response = await api.get('/entregas');
            return response.data;
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 13');
        }
    }

    static async deletarEntregasEmpresa() {
        try {
            await fetch('https://db-viera.up.railway.app/webhook', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then((res) => res.json())
                .then((res) => res)
                .catch((err) => console.log(err));

            await api.delete('/entregas');
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 14');
        }
    }

    static async buscartelefonenobanco(telefone) {
        try {
            const response = await api.get(`/fisica/${telefone}`);
            return response.data;
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 15');
        }
    }

    static async excluirnumerocliente(empresa, numero) {
        try {
            let response = await api.delete(`/clientes/${empresa}/${numero}`);
            return response.data;
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 16');
        }
    }

    static async buscarClientePorTelefone(telefone) {
        try {
            // Remove @c.us ou @lid do telefone para comparar
            let telefoneClean = telefone.replace('@c.us', '').replace('@lid', '');

            // Busca todos os clientes
            let response = await api.get('/clientes');
            const clientes = response.data;

            // Função para normalizar telefone (remover @c.us se existir)
            const normalizarTelefone = (tel) => {
                if (!tel || tel === 'Sem registro') return '';
                return tel.replace('@c.us', '').replace('@lid', '');
            };

            // Verifica se o telefone está cadastrado em algum cliente
            for (let cliente of clientes) {
                const tel1 = normalizarTelefone(cliente.telefoneum);
                const tel2 = normalizarTelefone(cliente.telefonedois);
                const tel3 = normalizarTelefone(cliente.telefonetres);
                const tel4 = normalizarTelefone(cliente.telefonequatro);
                const tel5 = normalizarTelefone(cliente.telefonecinco);

                if (
                    tel1 === telefoneClean ||
                    tel2 === telefoneClean ||
                    tel3 === telefoneClean ||
                    tel4 === telefoneClean ||
                    tel5 === telefoneClean
                ) {
                    console.log(`✅ Telefone ${telefoneClean} encontrado no cliente ${cliente.codigo} - ${cliente.nome}`);
                    return cliente; // Retorna o cliente encontrado
                }
            }

            console.log(`❌ Telefone ${telefoneClean} NÃO está cadastrado em nenhum cliente`);
            return null; // Não encontrou o telefone em nenhum cliente
        } catch (error) {
            console.log('DEU ERRO NA REQUISIÇÃO - 17 (buscarClientePorTelefone)', error.message);
            return null;
        }
    }
}

module.exports = { Requests };