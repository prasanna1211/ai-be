const { uuid } = require('uuidv4');
class WebSocketHandler {
    constructor(onSearch) {
        this.clients = new Map();
        this.onSearch = onSearch;
    }

    handleConnection(ws) {
        const clientId = uuid();
        this.clients.set(clientId, ws);

        console.log(`New WebSocket connection established with ID: ${clientId}`);

        this.sendWelcomeMessage(ws, clientId);
        this.setupMessageHandler(ws, clientId);
        this.setupDisconnectionHandler(ws, clientId);
        this.setupErrorHandler(ws, clientId);
    }

    sendWelcomeMessage(ws, clientId) {
        this.sendMessage(ws, {
            type: 'connection',
            clientId: clientId,
            message: 'Welcome to the WebSocket server!'
        });
    }

    sendMessage(ws, data) {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    setupMessageHandler(ws, clientId) {
        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message);
                console.log(`Received from ${clientId}:`, parsedMessage);

                // Handle searchText message
                if (parsedMessage.searchText !== undefined) {
                    // Call the search callback if provided
                    if (this.onSearch) {
                        this.onSearch(parsedMessage.searchText, clientId);
                    }

                    this.sendMessage(ws, {
                        type: 'search_ack',
                        message: 'Ack',
                        searchText: parsedMessage.searchText,
                        clientId: clientId
                    });
                    return;
                }

                // Handle other messages
                this.sendMessage(ws, {
                    type: 'response',
                    message: `Server received: ${message}`,
                    clientId: clientId
                });
            } catch (error) {
                console.error('Error parsing message:', error);
                this.sendMessage(ws, {
                    type: 'error',
                    message: 'Invalid message format',
                    clientId: clientId
                });
            }
        });
    }

    setupDisconnectionHandler(ws, clientId) {
        ws.on('close', () => {
            console.log(`Client ${clientId} disconnected`);
            this.clients.delete(clientId);
        });
    }

    setupErrorHandler(ws, clientId) {
        ws.on('error', (error) => {
            console.error(`Error with client ${clientId}:`, error);
            this.clients.delete(clientId);
        });
    }

    sendToClient(clientId, data) {
        const ws = this.clients.get(clientId);
        if (ws) {
            this.sendMessage(ws, data);
        }
    }

    broadcast(data) {
        this.clients.forEach((ws) => {
            this.sendMessage(ws, data);
        });
    }

    renderPlanSteps(clientId, title, steps) {
        const planStepsMessage = {
            key: 'renderListSteps',
            title: title,
            steps: steps
        };

        this.sendToClient(clientId, planStepsMessage);
    }

    renderCurrentStepTitle(clientId, header, value) {
        const planStepsMessage = {
            key: 'renderCurrentStepTitle',
            header: header,
            value: value
        };
        this.sendToClient(clientId, planStepsMessage);
    }

    renderStepResult(clientId, step, resultTitle) {
        const planStepsMessage = {
            key: 'renderStepResult',
            step: step,
            resultTitle: resultTitle,
        };
        this.sendToClient(clientId, planStepsMessage);
    }

    renderLog(clientId, log) {
        const planStepsMessage = {
            key: 'renderLog',
            log: log
        };
        this.sendToClient(clientId, planStepsMessage);
    }
}

module.exports = WebSocketHandler; 