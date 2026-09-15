import axios from "axios";
import { GuildMember, User } from "discord.js";
import logger from "../logger.mjs";
import { ParseContent } from "../index.mjs";

GuildMember.prototype.bannerURL = async function ({ format, size = 1024, dynamic } = {}) {
    //? Credted to vante
    if (format && !['png', 'jpeg', 'webp', 'gif'].includes(format)) throw new SyntaxError('Please specify an available format.');
    if (size && ![512, 1024, 2048, 4096].includes(parseInt(size) || isNaN(parseInt(size)))) throw new SyntaxError('Please specify an avaible size.');
    if (dynamic && typeof dynamic !== 'boolean') throw new SyntaxError('Dynamic option must be Boolean.')
    const response = await axios.get(`https://discord.com/api/v10/users/${this.id}`, { headers: { 'Authorization': `Bot ${this.client.token}` } });
    if (!response.data.banner) return `${response.data.banner_color !== null ? `https://singlecolorimage.com/get//${response.data.banner_color.replace('#', '')}/512x254` : `https://vante.dev/img/512x254.png`}`
    if (format == 'gif' || dynamic == true && response.data.banner.startsWith('a_')) return `https://cdn.discordapp.com/banners/${response.data.id}/${response.data.banner}.gif${parseInt(size) ? `?size=${parseInt(size)}` : ''}`
    else return `https://cdn.discordapp.com/banners/${response.data.id}/${response.data.banner}.${format}${parseInt(size) ? `?size=${parseInt(size)}` : ''}`
}

User.prototype.safeSend = async function (content) {
    try {
        const no_guild = { Language: "en", Theme: "Yellow" };
        content = ParseContent(content, no_guild);
        return await this.send(content)
    } catch (e) {
        logger(e, "error")
    }
}