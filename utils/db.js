const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');

async function ensureDbExists() {
    try {
        const dataDir = path.dirname(DB_PATH);
        console.log('Creating data directory:', dataDir);
        await fs.mkdir(dataDir, { recursive: true });

        try {
            await fs.access(DB_PATH);
            console.log('Database file exists');
        } catch {
            console.log('Creating new database file');
            const initialData = {
                users: {},
                metadata: {
                    createdAt: new Date().toISOString(),
                    version: '1.0'
                }
            };
            await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2));
            console.log('Database file created successfully');
        }
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error; // Rethrow to handle in main
    }
}

async function readDb() {
    try {
        console.log('Reading database file');
        const data = await fs.readFile(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { users: {} };
    }
}

async function writeDb(data) {
    try {
        console.log('Writing to database file');
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
        console.log('Database updated successfully');
    } catch (error) {
        console.error('Error writing to database:', error);
        throw error;
    }
}

async function updateUser(userId, userData) {
    try {
        console.log('Updating user:', userId);
        const db = await readDb();
        const existingUser = db.users[userId] || {};

        db.users[userId] = {
            ...existingUser,
            ...userData,
            updatedAt: new Date().toISOString(),
            count: existingUser.count || 0
        };

        if (!existingUser.createdAt) {
            console.log('New user, setting creation time');
            db.users[userId].createdAt = new Date().toISOString();
        }

        await writeDb(db);
        console.log('User updated successfully:', userId);
        return db.users[userId];
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

async function getUser(userId) {
    try {
        const db = await readDb();
        return db.users[userId] || null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

async function updateUserCount(userId, newTokens) {
    try {
        console.log(`Updating token count for user ${userId}: +${newTokens}`);
        const db = await readDb();
        const user = db.users[userId];

        if (!user) {
            console.error(`User ${userId} not found when updating token count`);
            return;
        }

        // Just update the count
        user.count = (user.count || 0) + newTokens;
        user.updatedAt = new Date().toISOString();

        await writeDb(db);

        // Get WebSocketHandler instance and update clients
        const WebSocketHandler = require('../websocket_handler');
        const handler = WebSocketHandler.getInstance();

        if (handler) {
            const clients = Array.from(handler.clients.entries())
                .filter(([_, client]) => client.userId === userId);

            for (const [clientId] of clients) {
                handler.updateTokenCount(clientId, user.count);
            }
        }

        console.log(`Token count updated for user ${userId}. New total: ${user.count}`);
        return user.count;
    } catch (error) {
        console.error('Error updating user token count:', error);
        throw error;
    }
}

module.exports = {
    ensureDbExists,
    updateUser,
    getUser,
    updateUserCount
};