const { OAuth2Client } = require('google-auth-library');
const { updateUser } = require('./utils/db');
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
            const payload = ticket.getPayload();
            console.log('Token verified successfully:', payload.email);
            return payload;
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return null;
        }
    }

    handleConnection(ws) {
        const clientId = Math.random().toString(36).substring(7);
        let isAuthenticated = false;
        let userId = null;

        console.log('New client connected:', clientId);

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
                    userId = payload.sub;

                    // Store or update user data
                    await updateUser(userId, {
                        email: payload.email,
                        name: payload.name,
                        picture: payload.picture,
                        lastLogin: new Date().toISOString()
                    });

                    this.clients.set(clientId, { ws, userId });
                    console.log('Client authenticated and stored:', clientId, payload.email);

                    // Send acknowledgment back to client
                    ws.send(JSON.stringify({
                        key: 'auth_success',
                        message: 'Authentication successful'
                    }));
                    return;
                }

                if (!isAuthenticated || !userId) {
                    console.log('Unauthenticated request from client:', clientId);
                    ws.close();
                    return;
                }

                if (data.searchText) {
                    this.searchCallback(data.searchText, clientId, userId);
                }
            } catch (error) {
                console.error('Error processing message:', error);
                ws.send(JSON.stringify({
                    key: 'error',
                    message: 'Error processing request'
                }));
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected:', clientId);
            this.clients.delete(clientId);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error for client:', clientId, error);
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