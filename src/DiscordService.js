import axios from 'axios';

const API_BASE = 'https://discord.com/api/v9';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const DiscordService = {
    async testToken(token) {
        try {
            const response = await axios.get(`${API_BASE}/users/@me`, {
                headers: { Authorization: token }
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Invalid token');
        }
    },

    async getGuilds(token) {
        try {
            const response = await axios.get(`${API_BASE}/users/@me/guilds`, {
                headers: { Authorization: token }
            });
            return response.data;
        } catch (error) {
            throw new Error('Failed to fetch guilds');
        }
    },

    async searchMessages(token, guildId, authorId, offset = 0) {
        try {
            const response = await axios.get(`${API_BASE}/guilds/${guildId}/messages/search?author_id=${authorId}&offset=${offset}`, {
                headers: { Authorization: token }
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 429) {
                const retryAfter = (error.response.data.retry_after || 5) * 1000;
                await sleep(retryAfter);
                return this.searchMessages(token, guildId, authorId, offset);
            }
            throw new Error('Search failed: ' + (error.response?.data?.message || error.message));
        }
    },

    async deleteMessage(token, channelId, messageId) {
        try {
            await axios.delete(`${API_BASE}/channels/${channelId}/messages/${messageId}`, {
                headers: { Authorization: token }
            });
            return true;
        } catch (error) {
            if (error.response?.status === 429) {
                const retryAfter = (error.response.data.retry_after || 5) * 1000;
                await sleep(retryAfter);
                return this.deleteMessage(token, channelId, messageId);
            }
            return false;
        }
    }
};
