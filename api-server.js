const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('./index.js');
const qrcode = require('qrcode-terminal');
const { fisica } = require('./src/fisica');
const { empresa } = require('./src/empresa');
const { clientecadastro } = require('./src/clientecadastro');
const { sosregistrarcodigo } = require('./src/sosregistrarcodigo');
const { Requests } = require('./src/request');
const {
    codigoetelefone,
    checkingNumbers,
    cronJob,
    listarentregasequantidade,
    listartodosclientescadastrados,
    buscardadosdecadastradodaempresa,
    deletarentregas,
    deletarcliente,
    ativarchatbot,
    desativarchatbot,
    listarQuantidadeDeEntregasDaEmpresa,
    excluirnumerocliente
} = require('./src/middlewares');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 7005;

// Sistema de controle de mensagens duplicadas e periodo de warmup
let canRespondToMessages = false;
let warmupTimeout = null;
const processedMessages = new Map();
const WARMUP_PERIOD = 20000; // 20 segundos
const MESSAGE_CACHE_TIME = 300000; // 5 minutos

// Funcao para verificar se mensagem ja foi processada
function isMessageAlreadyProcessed(messageId) {
    const now = Date.now();

    if (processedMessages.has(messageId)) {
        const processedAt = processedMessages.get(messageId);
        if (now - processedAt < MESSAGE_CACHE_TIME) {
            return true;
        }
        processedMessages.delete(messageId);
    }

    processedMessages.set(messageId, now);
    return false;
}

// Limpar mensagens antigas do cache a cada 10 minutos
function cleanupOldMessages() {
    const now = Date.now();
    for (const [msgId, processedAt] of processedMessages.entries()) {
        if (now - processedAt > MESSAGE_CACHE_TIME) {
            processedMessages.delete(msgId);
        }
    }
}
setInterval(cleanupOldMessages, 600000);

app.use(express.json());

let client;
let isClientReady = false;

// Sistema de bloqueio de mensagens spam
const messageTracker = new Map();
const BLOCK_THRESHOLD = 5;
const TIME_WINDOW = 300000; // 5 minutos

function shouldBlockMessage(phoneNumber, messageContent) {
    const key = `${phoneNumber}:${messageContent.toLowerCase().trim()}`;
    const now = Date.now();

    if (!messageTracker.has(key)) {
        messageTracker.set(key, { count: 1, firstSeen: now });
        return false;
    }

    const data = messageTracker.get(key);

    if (now - data.firstSeen > TIME_WINDOW) {
        messageTracker.set(key, { count: 1, firstSeen: now });
        return false;
    }

    data.count++;

    if (data.count >= BLOCK_THRESHOLD) {
        console.log(`BLOCKED: ${phoneNumber} - Mensagem repetida ${data.count} vezes: "${messageContent}"`);
        return true;
    }

    return false;
}

// Limpeza periodica do tracker
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of messageTracker.entries()) {
        if (now - data.firstSeen > TIME_WINDOW) {
            messageTracker.delete(key);
        }
    }
}, 600000);

const initializeClient = () => {
    console.log('='.repeat(60));
    console.log('Inicializando cliente WhatsApp...');
    console.log('='.repeat(60));

    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', async (qr) => {
        console.log('QR Code gerado. Acesse http://localhost:' + PORT + ' para escanear');
        qrcode.generate(qr, {small: true});

        const qrDataURL = await QRCode.toDataURL(qr);
        io.emit('qr', qrDataURL);
    });

    client.on('ready', () => {
        console.log('Cliente autenticado e pronto!');
        isClientReady = true;
        canRespondToMessages = false;
        io.emit('ready');

        // Iniciar periodo de warmup (20 segundos para sincronizar mensagens antigas)
        console.log('Iniciando periodo de warmup (20 segundos)...');
        console.log('Mensagens antigas serao ignoradas durante este periodo');
        io.emit('warmup_started', { message: 'Carregando historico de mensagens, aguarde...', duration: WARMUP_PERIOD });

        if (warmupTimeout) {
            clearTimeout(warmupTimeout);
        }

        warmupTimeout = setTimeout(() => {
            canRespondToMessages = true;
            console.log('Sistema pronto! Bot operacional e pronto para responder mensagens.');
            io.emit('warmup_completed', { message: 'Sistema pronto! Bot operacional.' });
        }, WARMUP_PERIOD);

        // Iniciar cron job
        cronJob();
    });

    client.on('loading_screen', (percent, message) => {
        console.log('LOADING SCREEN', percent, message);
    });

    client.on('authenticated', () => {
        console.log('AUTHENTICATED');
        io.emit('authenticated');
    });

    client.on('auth_failure', (msg) => {
        console.error('AUTHENTICATION FAILURE:', msg);
        io.emit('auth_failure', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('Client was logged out:', reason);
        isClientReady = false;
        canRespondToMessages = false;
        io.emit('disconnected', reason);

        if (warmupTimeout) {
            clearTimeout(warmupTimeout);
            warmupTimeout = null;
        }

        if (reason !== 'LOGOUT') {
            console.log('Tentando reconectar em 5 segundos...');
            setTimeout(() => {
                client.initialize();
            }, 5000);
        }
    });

    client.on('change_state', state => {
        console.log('CHANGE STATE', state);
    });

    // Handler principal de mensagens - LOGICA DO CHATBOT
    client.on('message', async msg => {
        console.log('MESSAGE RECEIVED:', msg.from, '-', msg.body);

        // 1. IGNORAR STATUS DO WHATSAPP
        if (msg.from === 'status@broadcast') {
            console.log('Status do WhatsApp ignorado');
            return;
        }

        // 2. VERIFICAR SE MENSAGEM JA FOI PROCESSADA (evita duplicatas)
        const messageId = msg.id.id || `${msg.from}_${msg.timestamp}`;
        if (isMessageAlreadyProcessed(messageId)) {
            console.log(`Mensagem duplicada ignorada: ${msg.from} - ID: ${messageId}`);
            return;
        }

        // 3. VERIFICAR MENSAGENS REVOGADAS
        if (msg.type === 'revoked') {
            console.log('Mensagem revogada ignorada:', msg.from);
            return;
        }

        // 4. PERIODO DE WARMUP - Ignorar mensagens antigas durante os primeiros 20 segundos
        if (!canRespondToMessages) {
            console.log(`WARMUP: Mensagem ignorada durante periodo de aquecimento de ${msg.from}: "${msg.body}"`);
            return;
        }

        // 5. IGNORAR MENSAGENS VAZIAS (sem conteudo)
        if (!msg.body || msg.body.trim() === '') {
            console.log(`Mensagem vazia ignorada de ${msg.from}`);
            return;
        }

        // SOLUCAO: Obter numero real quando for LID
        let numeroReal = msg.from;
        if (msg.from.includes('@lid')) {
            try {
                const contact = await msg.getContact();
                numeroReal = contact.id._serialized; // Pode ser o numero real com @c.us
                console.log('Convertido LID para numero real:', msg.from, '->', numeroReal);
            } catch (error) {
                console.log('Erro ao obter contato do LID:', error.message);
            }
        }

        // Bloquear mensagens de spam
        if (shouldBlockMessage(numeroReal, msg.body)) {
            console.log(`Mensagem bloqueada de ${numeroReal}: "${msg.body}"`);
            return;
        }

        let msgNumber = await checkingNumbers(msg);

        // Criar objeto msg modificado com numeroReal para passar as funcoes
        let msgComNumeroReal = { ...msg, from: numeroReal };
        let etapaRetrieve = await Requests.retrieveEtapa(msgComNumeroReal);

        let codigotelefone_value = codigoetelefone(numeroReal, msgNumber);

        // NOVA LOGICA: Verifica se o telefone esta cadastrado em algum CLIENTE (empresa)
        let clienteDoTelefone = await Requests.buscarClientePorTelefone(numeroReal);

        // IMPORTANTE: Verifica se esta em fluxo de empresa E se ainda esta autorizado
        let estaEmFluxoEmpresa = etapaRetrieve && etapaRetrieve.codigo;

        // Etapas de cadastro (nao devem ser resetadas)
        const etapasDeCadastro = ['1', '2', '3', '4', '5', '6', '7', '8', '10', '11', '20', '21', '22', '23', '24'];
        const estaEmFluxoDeCadastro = etapaRetrieve && etapasDeCadastro.includes(etapaRetrieve.etapa);

        // Se esta em fluxo de empresa mas nao esta mais cadastrado em nenhum cliente
        // E nao enviou um codigo valido, E NAO esta em fluxo de cadastro, resetar para pessoa fisica
        if (estaEmFluxoEmpresa && !clienteDoTelefone && !codigotelefone_value && !(msgNumber && typeof msgNumber === 'object') && !estaEmFluxoDeCadastro) {
            console.log('Numero nao esta mais autorizado, resetando para pessoa fisica');
            await Requests.updateEtapa(numeroReal, { etapa: 'a', codigo: null });
            estaEmFluxoEmpresa = false;
        }

        // Debug logs
        console.log('DEBUG - numeroReal:', numeroReal);
        console.log('DEBUG - msgNumber:', msgNumber);
        console.log('DEBUG - etapaRetrieve:', etapaRetrieve);
        console.log('DEBUG - clienteDoTelefone:', clienteDoTelefone ? `Cliente ${clienteDoTelefone.codigo} - ${clienteDoTelefone.nome}` : 'Nenhum cliente');
        console.log('DEBUG - codigotelefone_value:', codigotelefone_value);
        console.log('DEBUG - estaEmFluxoEmpresa:', estaEmFluxoEmpresa);

        // CORRIGIDO: Usar horario de Sao Paulo (America/Sao_Paulo)
        const date = new Date();
        const dateStringSaoPaulo = date.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour12: false
        });

        // Extrair hora e minuto do horario de Sao Paulo
        const dateSaoPaulo = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const h = dateSaoPaulo.getHours();
        const m = dateSaoPaulo.getMinutes();

        // LOGS DE DEBUG - Horario do servidor
        console.log('='.repeat(60));
        console.log('DEBUG HORARIO DO SERVIDOR');
        console.log('Data completa (UTC):', date.toUTCString());
        console.log('Data completa (Local servidor):', date.toString());
        console.log('Data completa (Sao Paulo):', dateStringSaoPaulo);
        console.log('Timezone offset servidor (minutos):', date.getTimezoneOffset());
        console.log('Hora atual (Sao Paulo):', h);
        console.log('Minutos atuais (Sao Paulo):', m);
        console.log('Horario formatado (Sao Paulo):', `${h}:${m.toString().padStart(2, '0')}`);
        console.log('='.repeat(60));

        if (etapaRetrieve !== undefined && etapaRetrieve.ativado == true) {
            sosregistrarcodigo(msgComNumeroReal, etapaRetrieve, client);
            clientecadastro(msgNumber, msgComNumeroReal, etapaRetrieve, client);
            const message = msg.body.toLowerCase();
            let desativar = message.slice(0, 9);
            let ativar = message.slice(0, 6);
            let listDelivery = message.includes('entregas/');

            // FLUXO DE EMPRESA acontece quando:
            // 1. Ja esta em um fluxo de empresa (etapaRetrieve.codigo existe) OU
            // 2. O telefone esta cadastrado em algum cliente E enviou um codigo valido
            if ((estaEmFluxoEmpresa || clienteDoTelefone || (msgNumber && typeof msgNumber === 'object'))
                && !listDelivery && ativar != 'ativar' && desativar != 'desativar') {

                console.log('FLUXO: Empresa detectado');
                console.log(`Verificacao de horario: ${h}:${m.toString().padStart(2, '0')}`);

                if ((h > 9 || (h === 9 && m >= 30)) && h < 23) {
                    console.log('BOT ATIVO - Processando mensagem de empresa');
                    empresa(msgComNumeroReal, msgNumber, etapaRetrieve, codigotelefone_value, client);
                } else if (h < 9 || (h === 9 && m < 30)) {
                    console.log('BOT INATIVO - Antes das 9:30');
                    client.sendMessage(numeroReal, `Olá! 😃
Gostaríamos de informar que nosso horário de *atendimento* inicia às 🕥 *9h30* até às 23h00 🕙 e as *atividades* iniciam às 🕙 *10h00*.

Se você tiver alguma dúvida ou precisar de assistência, recomendamos que entre em contato novamente a partir das 🕥 9h30. 🏍️

Obrigado pela compreensão!`);
                } else if (h >= 23) {
                    console.log('BOT INATIVO - Apos as 23:00');
                    client.sendMessage(numeroReal, `Pedimos desculpas pelo inconveniente, pois nosso horário de *atendimento* é das 🕥 *9h30* até às 23h00 🕙 e as *atividades* são das 🕙 *10h00* até às 23h00.

Se você tiver alguma dúvida ou precisar de assistência, recomendamos que entre em contato novamente amanhã a partir das 🕥 9h30. 🏍️

Agradecemos pela compreensão.`);
                }
            // Se o telefone NAO esta cadastrado em nenhum cliente -> FLUXO DE PESSOA FISICA
            } else if (!clienteDoTelefone && !listDelivery) {

                console.log('FLUXO: Pessoa fisica detectado');
                console.log(`Verificacao de horario: ${h}:${m.toString().padStart(2, '0')}`);

                if ((h > 9 || (h === 9 && m >= 30)) && h < 23) {
                    console.log('BOT ATIVO - Processando mensagem de pessoa fisica');
                    let registrarCode = msg.body.includes('/registrar/.');
                    let registrar = msg.body.includes('/registrar');
                    if (!registrarCode && !registrar) {
                        fisica(msgComNumeroReal, etapaRetrieve, client, clienteDoTelefone);
                    }
                } else if (h < 9 || (h === 9 && m < 30)) {
                    console.log('BOT INATIVO - Antes das 9:30');
                    client.sendMessage(numeroReal, `Olá! 😃
Gostaríamos de informar que nosso horário de *atendimento* inicia às 🕥 *9h30* até às 23h00 🕙 e as *atividades* iniciam às 🕙 *10h00*.

Se você tiver alguma dúvida ou precisar de assistência, recomendamos que entre em contato novamente a partir das 🕥 9h30. 🏍️

Obrigado pela compreensão!`);
                } else if (h >= 23) {
                    console.log('BOT INATIVO - Apos as 23:00');
                    client.sendMessage(numeroReal, `Olá! 😃
Pedimos desculpas pelo inconveniente, pois nosso horário de *atendimento* é das 🕥 *9h30* até às 23h00 🕙 e as *atividades* são das 🕙 *10h00* até às 23h00.

Se você tiver alguma dúvida ou precisar de assistência, recomendamos que entre em contato conosco novamente amanhã a partir das 🕥 9h30, quando retomaremos nosso atendimento, e as atividades iniciam às 🕙 10h00. 🏍️

Agradecemos pela compreensão.`);
                }
            }
        }

        listarentregasequantidade(msgComNumeroReal, client);
        listartodosclientescadastrados(msgComNumeroReal, client);
        buscardadosdecadastradodaempresa(msgComNumeroReal, client, msgNumber);
        deletarentregas(msgComNumeroReal, client);
        deletarcliente(msgComNumeroReal, client);
        ativarchatbot(msgComNumeroReal, client);
        desativarchatbot(msgComNumeroReal, client);
        listarQuantidadeDeEntregasDaEmpresa(codigotelefone_value, msgComNumeroReal, client);
        excluirnumerocliente(msgComNumeroReal, client);
    });

    client.on('message_create', async (msg) => {
        if (msg.fromMe) {
            // do stuff here
        }
    });

    client.on('group_join', (notification) => {
        console.log('join', notification);
    });

    client.on('group_leave', (notification) => {
        console.log('leave', notification);
    });

    client.on('group_update', (notification) => {
        console.log('update', notification);
    });

    client.on('group_admin_changed', (notification) => {
        if (notification.type === 'promote') {
            console.log(`You were promoted by ${notification.author}`);
        } else if (notification.type === 'demote')
            console.log(`You were demoted by ${notification.author}`);
    });

    client.on('group_membership_request', async (notification) => {
        console.log(notification);
    });

    client.on('message_reaction', async (reaction) => {
        console.log('REACTION RECEIVED', reaction);
    });

    client.on('vote_update', (vote) => {
        console.log(vote);
    });

    client.initialize();
};

// Endpoint para enviar mensagem para numero individual
app.post('/send-message', async (req, res) => {
    try {
        let { number, message } = req.body;

        if (!number || !message) {
            return res.status(400).json({
                success: false,
                error: 'Campos "number" e "message" sao obrigatorios'
            });
        }

        if (!isClientReady || !canRespondToMessages) {
            return res.status(503).json({
                success: false,
                error: 'Cliente WhatsApp nao esta pronto. Aguarde a inicializacao e o periodo de warmup (20s).'
            });
        }

        // Adicionar codigo do pais se nao estiver presente
        if (!number.startsWith('55') && /^[1-9][0-9]{10}$/.test(number)) {
            number = `55${number}`;
            console.log(`Codigo do pais adicionado automaticamente: ${number}`);
        }

        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

        const sentMessage = await client.sendMessage(chatId, message);

        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso',
            messageId: sentMessage.id.id,
            to: number
        });

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao enviar mensagem'
        });
    }
});

// Endpoint para enviar mensagem para grupo
app.post('/send-group-message', async (req, res) => {
    try {
        const { name, message } = req.body;

        if (!name || !message) {
            return res.status(400).json({
                success: false,
                error: 'Campos "name" e "message" sao obrigatorios'
            });
        }

        if (!isClientReady || !canRespondToMessages) {
            return res.status(503).json({
                success: false,
                error: 'Cliente WhatsApp nao esta pronto. Aguarde a inicializacao e o periodo de warmup (20s).'
            });
        }

        // Buscar o grupo pelo nome
        const chats = await client.getChats();
        const group = chats.find(chat =>
            chat.isGroup &&
            chat.name.toLowerCase().includes(name.toLowerCase())
        );

        if (!group) {
            return res.status(404).json({
                success: false,
                error: `Grupo "${name}" nao encontrado`
            });
        }

        const sentMessage = await client.sendMessage(group.id._serialized, message);

        res.json({
            success: true,
            message: 'Mensagem enviada para o grupo com sucesso',
            messageId: sentMessage.id.id,
            groupName: group.name,
            groupId: group.id._serialized
        });

    } catch (error) {
        console.error('Erro ao enviar mensagem para grupo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao enviar mensagem para grupo'
        });
    }
});

// Endpoint para verificar status
app.get('/status', (req, res) => {
    res.json({
        success: true,
        clientReady: isClientReady,
        canSendMessages: canRespondToMessages,
        status: canRespondToMessages ? 'ready' : (isClientReady ? 'warmup' : 'initializing')
    });
});

// Pagina inicial com QR Code
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp QR Code</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }

        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }

        #qr-container {
            background: #f5f5f5;
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
            min-height: 300px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        #qrcode {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
        }

        .status {
            padding: 12px 24px;
            border-radius: 25px;
            font-weight: 500;
            font-size: 14px;
            margin-top: 20px;
            display: inline-block;
        }

        .status.waiting {
            background: #fff3cd;
            color: #856404;
        }

        .status.authenticated {
            background: #d4edda;
            color: #155724;
        }

        .status.ready {
            background: #d1ecf1;
            color: #0c5460;
        }

        .status.error {
            background: #f8d7da;
            color: #721c24;
        }

        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            vertical-align: middle;
            margin-right: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .info {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            text-align: left;
        }

        .info-title {
            font-weight: 600;
            color: #1976D2;
            margin-bottom: 8px;
        }

        .info-text {
            color: #555;
            font-size: 13px;
            line-height: 1.6;
        }

        .success-icon {
            font-size: 64px;
            color: #28a745;
            animation: checkmark 0.5s ease-in-out;
        }

        @keyframes checkmark {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>WhatsApp Web</h1>
        <p class="subtitle">Escaneie o QR Code para conectar</p>

        <div id="qr-container">
            <div class="loading"></div>
        </div>

        <div id="status" class="status waiting">
            Aguardando QR Code...
        </div>

        <div class="info">
            <div class="info-title">Como conectar:</div>
            <div class="info-text">
                1. Abra o WhatsApp no seu celular<br>
                2. Toque em Menu ou Configuracoes<br>
                3. Toque em Aparelhos conectados<br>
                4. Toque em Conectar um aparelho<br>
                5. Aponte seu celular para esta tela para escanear o QR Code
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const qrContainer = document.getElementById('qr-container');
        const statusDiv = document.getElementById('status');

        socket.on('qr', (qrData) => {
            console.log('QR Code recebido');
            qrContainer.innerHTML = '<img id="qrcode" src="' + qrData + '" alt="QR Code">';
            statusDiv.textContent = 'Escaneie o QR Code';
            statusDiv.className = 'status waiting';
        });

        socket.on('authenticated', () => {
            console.log('Autenticado');
            statusDiv.textContent = 'Autenticado com sucesso!';
            statusDiv.className = 'status authenticated';
            qrContainer.innerHTML = '<div class="success-icon">&#10003;</div>';
        });

        socket.on('ready', () => {
            console.log('Pronto');
            statusDiv.textContent = 'WhatsApp conectado e pronto!';
            statusDiv.className = 'status ready';
        });

        socket.on('loading', (data) => {
            console.log('Carregando:', data.percent + '%');
            statusDiv.textContent = 'Carregando... ' + data.percent + '%';
            statusDiv.className = 'status waiting';
        });

        socket.on('auth_failure', (msg) => {
            console.error('Falha na autenticacao:', msg);
            statusDiv.textContent = 'Falha na autenticacao';
            statusDiv.className = 'status error';
            qrContainer.innerHTML = '<div style="color: #dc3545; font-size: 48px;">&#10007;</div>';
        });

        socket.on('disconnected', (reason) => {
            console.log('Desconectado:', reason);
            statusDiv.textContent = 'Desconectado: ' + reason;
            statusDiv.className = 'status error';
        });
    </script>
</body>
</html>
    `);
});

server.listen(PORT, () => {
    console.log(`Servidor API rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log('Inicializando cliente WhatsApp...');
    initializeClient();
});
