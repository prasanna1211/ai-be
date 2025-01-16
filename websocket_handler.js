const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class WebSocketHandler {
    constructor(searchCallback) {
        this.clients = new Map();
        this.searchCallback = searchCallback;
    }

    async verifyGoogleToken(token) {
        try {
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            return ticket.getPayload();
        } catch (error) {
            console.error('Token verification failed:', error);
            return null;
        }
    }

    handleConnection(ws) {
        const clientId = Math.random().toString(36).substring(7);
        let isAuthenticated = false;

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === 'auth') {
                    const payload = await this.verifyGoogleToken(data.token);
                    if (!payload) {
                        console.log('Authentication failed for client:', clientId);
                        ws.close();
                        return;
                    }
                    isAuthenticated = true;
                    this.clients.set(clientId, { ws, userId: payload.sub });
                    console.log('Client authenticated:', clientId, payload.email);
                    return;
                }

                if (!isAuthenticated) {
                    console.log('Unauthenticated request from client:', clientId);
                    ws.close();
                    return;
                }

                if (data.searchText) {
                    this.searchCallback(data.searchText, clientId);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        ws.on('close', () => {
            this.clients.delete(clientId);
        });
    }

    renderPlanSteps(clientId, title, steps) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.ws.send(JSON.stringify({
            key: 'renderListSteps',
            title,
            steps,
        }));
    }

    renderCurrentStepTitle(clientId, header, value) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.ws.send(JSON.stringify({
            key: 'renderCurrentStepTitle',
            header,
            value,
        }));
    }

    renderStepResult(clientId, step, resultTitle) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.ws.send(JSON.stringify({
            key: 'renderStepResult',
            step,
            resultTitle,
        }));
    }

    renderLog(clientId, log) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.ws.send(JSON.stringify({
            key: 'renderLog',
            log,
        }));
    }
}

module.exports = WebSocketHandler; 