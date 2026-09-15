import vanteGA from "vante-giveaways"
import Bot from "../../client.mjs"
import { ButtonStyle } from "discord.js"
import fs from 'fs/promises';
import { EmbedBuilder } from "../index.mjs";

export default class GiveawaysManager extends vanteGA.GiveawaysManager {
    /**
     * @param {Bot} client 
     */
    constructor(client) {
        super(client, {
            storage: `./Giveaways/${client.user.id}.json`,
            default: {
                botsCanWin: true,
                embedColor: client.embed.color,
                buttonEmoji: '🎉',
                buttonStyle: ButtonStyle.Secondary,
                lastChance: {
                    enabled: true,
                    content: '**LAST CHANCE TO ENTER!**',
                    threshold: 10000,
                    embedColor: client.embed.stanbycolor
                },
            },
        })
    }
}