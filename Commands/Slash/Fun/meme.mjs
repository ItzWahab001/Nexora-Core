import axios from 'axios';
import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Get a meme from a subreddit')
    ,
    category: 'Fun',
    cooldown: 5,
    run: async ({ interaction, err }) => {
        try {

            await interaction.deferReply();

            // Fetch meme from the specified subreddit
            const meme = await fetchMemeFromSubreddit();

            // Reply with the meme
            if (meme) {
                await interaction.editReply({ content: meme.title, files: [meme.image] });
            } else {
                await interaction.editReply('Failed to fetch meme.');
            }

        } catch (error) {
            err(error);
        }
    }
};

async function fetchMemeFromSubreddit() {
    try {
        const response = await axios.get("https://meme-api.com/gimme");

        if (response.data?.url) return {
            title: response.data.title,
            image: response.data.url,
        };
        
        return null;
    } catch (error) {
        console.error('Error fetching meme:', error);
        return null;
    }
}
