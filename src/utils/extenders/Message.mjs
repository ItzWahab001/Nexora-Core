import { BaseInteraction, Message, ModalSubmitInteraction, } from 'discord.js'
import { ParseContent, logger } from '../index.mjs'


Object.defineProperty(Message.prototype, 'user', {
    get() {
        return this.author
    },
})


Message.prototype.safeReply = async function (content) {
    try {
        const guildData = await this.guild.fetchData();
        content = ParseContent(content, guildData)
        return await this.reply(content)
    } catch (error) {
        logger(error, "error")
    }
}


Message.prototype.safeEdit = async function (content) {
    try {
        const guildData = await this.guild.fetchData();
        content = ParseContent(content, guildData)
        return await this.edit(content)
    } catch (error) {
        logger(error, "error")
    }
}


BaseInteraction.prototype.safeReply = async function (content) {
    try {
        const guildData = await this.guild.fetchData();
        content = ParseContent(content, guildData)
        await this.reply(content)
        return await this.fetchReply()
    } catch (e) {
        throw(e)
    }
}


BaseInteraction.prototype.safeEdit = async function (content) {
    try {
        const guildData = await this.guild.fetchData();
        content = ParseContent(content, guildData)
        return await this.editReply(content)
    } catch (e) {
        logger(e, "error")
    }
}

BaseInteraction.prototype.safeShowModal = async function (content) {
    try {
        const guildData = await this.guild.fetchData()
        content = ParseContent(content, guildData)
        return await this.showModal(content);
    } catch (e) {
        logger(e, "error")
    }
}


BaseInteraction.prototype.safeUpdate = async function (content) {
    try {
        const guildData = await this.guild.fetchData();
        content = ParseContent(content, guildData)
        return await this.update(content)
    } catch (e) {
        logger(e, "error")

    }
}


ModalSubmitInteraction.prototype.safeReply = async function (content) {
    try {
        const guildData = await this.guild.fetchData();
        content = ParseContent(content, guildData)
        return await this.reply(content)
    } catch (e) {
        logger(e, "error")
    }
}



ModalSubmitInteraction.prototype.safeEdit = async function (content) {
    try {
        const guildData = await this.guild.fetchData();
        content = ParseContent(content, guildData)
        return await this.editReply(content)
    } catch (e) {
        logger(e, "error")
    }
}


ModalSubmitInteraction.prototype.safeUpdate = async function (content) {
    try {
        const guildData = await this.guild.fetchData();
        content = ParseContent(content, guildData)
        return await this.update(content)
    } catch (e) {
        logger(e, "error")
    }
}