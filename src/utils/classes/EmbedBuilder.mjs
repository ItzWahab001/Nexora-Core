import { EmbedBuilder as Embed, Guild } from 'discord.js';
import * as Themes from "../../../Assets/Global/Themes.mjs"
import "../extenders/replaceEmoji.mjs"
import Bot from '../../client.mjs';


/**
 * A builder class for creating Discord message embeds.
 */
class EmbedBuilder {
    /**
     * Creates a new EmbedBuilder.
     * @param {Bot | null} client
     */
    constructor(client) {

        this.embed = new Embed();
        this.theme = client?.theme || "default";
        this._embed = client?.embed || Themes[this.theme].embed;
        this.embed.setColor(this._embed.color)

    }

    /**
     * Set default footer
     */
    setDefaultFooter() {
        this.embed.setFooter({
            text: this._embed.footertext,
            iconURL: this._embed.footericon
        })
        return this
    }

    /**
     * Sets the guild for the current context.
     * @param {Guild} guild - The guild to set.
     */
    // setGuild(guild) {

    //     /** @type {import("../../../Database/-Models/GuildConfig.json")} Data*/

    //     const Data = (async () => await guild.fetchData())();

    //     this.theme = Data?.Theme || this.theme
    //     this._embed = embed[Data?.Theme] || this._embed;

    //     console.log(this.theme, Data.Theme)

    //     this.setColor("color")

    //     return this;
    // }

    /**
     * Appends fields to the embed.
     *
     * @param {...import('discord.js').APIEmbedField} fields - The fields to add.
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    addFields(...fields) {
        this.embed.addFields(...fields);
        return this
    }

    /**
     * Removes, replaces, or inserts fields for this embed.
     *
     * @param {number} index - The index to start at.
     * @param {number} deleteCount - The number of fields to remove.
     * @param {...APIEmbedField} fields - The replacing field objects.
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    spliceFields(index, deleteCount, ...fields) {
        this.embed.spliceFields(index, deleteCount, ...fields);
        return this
    }

    /**
     * Sets the fields for this embed.
     *
     * @param {...import('discord.js').APIEmbedField} fields - The fields to set.
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    setFields(...fields) {
        this.embed.setFields(JSON.parse(JSON.stringify(...fields).replaceEmojis(this.theme)));
        return this
    }

    /**
     * Sets the author of this embed.
     *
     * @param {import('discord.js').EmbedAuthorOptions | null} options - The options to use.
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    setAuthor(options) {
        this.embed.setAuthor(options);
        return this
    }

    /**
     * Sets the color of this embed.
     * @param {import('discord.js').ColorResolvable | import('discord.js').RGBTuple | number | null} color
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    setColor(color) {
        if (Themes[this.theme]?.embed?.[color.replace("#", "")]) this.embed.setColor(Themes[this.theme].embed[color]);
        else this.embed.setColor(color);

        return this;
    }

    /**
     * Sets the description of this embed.
     *
     * @param {string | null} description - The description to use.
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    setDescription(description) {
        this.embed.setDescription(description.replaceEmojis(this.theme));
        return this;
    }

    setTheme(Theme) {
        this.theme = Theme;
        this.setColor("color");
        
        if (this.embed.data.description) this.setDescription(this.embed.data.description);
        if (this.embed.data.fields) this.setFields(this.embed.data.fields);
        if (this.embed.data.title) this.setTitle(this.embed.data.title);

        return this;
    }

    /**
     * Sets the footer of this embed.
     *
     * @param {import('discord.js').EmbedFooterOptions | null} options - The footer to use.
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    setFooter(options) {
        this.embed.setFooter(options);
        return this
    }

    /**
     * Sets the image of this embed.
     *
     * @param {string | null} url - The image URL to use.
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    setImage(url) {
        this.embed.setImage(url);
        return this
    }

    /**
     * Sets the thumbnail of this embed.
     *
     * @param {String | null} url - The thumbnail URL to use.
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    setThumbnail(url) {
        this.embed.setThumbnail(url);
        return this
    }

    /**
     * Sets the timestamp of this embed.
     *
     * @param {Date | number | null} timestamp - The timestamp or date to use.
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    setTimestamp(timestamp) {
        this.embed.setTimestamp(timestamp);
        return this
    }

    /**
     * Sets the title for this embed.
     *
     * @param {string | null} title - The title to use.
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    setTitle(title) {
        this.embed.setTitle(title.replaceEmojis(this.theme));
        return this
    }

    /**
     * Sets the URL of this embed.
     *
     * @param {string | null} url - The URL to use.
     * @returns {EmbedBuilder} This instance for method chaining.
     */
    setURL(url) {
        this.embed.setURL(url);
        return this
    }

    /**
     * Serializes this builder to API-compatible JSON data.
     *
     * @returns {APIEmbed} The JSON representation of the embed.
     */
    toJSON() {
        return this.embed.toJSON();
    }

    /**
     * Returns the embedded content.
     * @returns The embedded content.
     */
    build() {
        return this.embed
    }

}

export default EmbedBuilder;
