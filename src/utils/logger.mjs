import 'colors'
import { Webhook, WebhookClient, parseWebhookURL } from 'discord.js'
import config from '../../Assets/Global/config.mjs';
import { EmbedBuilder } from './index.mjs';
import Bot from '../client.mjs';

/**
* @param {"error" | "simple" | null} type
* @param {Boolean | Object | String | Error} data
 */
export default (data, type) => {
    var currentdate = new Date();
    let logstring = ` ${`${`${currentdate.getDate()}/${currentdate.getMonth() + 1}/${currentdate.getFullYear()}`.brightBlue.bold} ${`│`.brightMagenta.bold}`}`;

    if (typeof data == "string") {

        console.log(logstring, data.split("\n").map(d => `${d}`.green).join(`\n${logstring} `))

    }

    else if (typeof data == "object") {

        if (type && type === "error") {
            const splited = data?.stack?.split("\n");
            console.log(logstring, `${data.name.red.bold}: ${data.message.yellow}`);

            splited?.shift();
            console.log(" " + splited?.map(a => a.gray).join("\n "))
            // stack


            webhookLog({
                embeds: [
                    new EmbedBuilder().setColor("Blurple").setDescription(`_An error has occured_.\n\n**Error Code:** \`${data.name}\`\n**Error Message:** \`${data?.message}\`\n**Stack:** \`\`\`yml\n${data?.stack}\`\`\``)
                        .setFooter({ text: `Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB | CPU: ${(process.cpuUsage().system / 1024 / 1024).toFixed(2)}%` })
                ]
            }, "Error")

        } else console.log(logstring, JSON.stringify(data, null, 3).green)

    }

    else if (typeof data == "boolean") {
        console.log(logstring, String(data).cyan)
    }

    else {
        console.log(logstring, data)
    }
}

/**
 * @param {import('discord.js').MessageReplyOptions} data
 * @param {"Command" | "Error" | "Ready"} type 
 * @param {Bot} client
 */
export const webhookLog = (data, type, client) => {

    if (config.Log[type]) new WebhookClient({ url: config.Log[type] }).send({
        username: `${type} - ${client ? `${client?.user?.username || client.config.CLIENT_ID}` : ""}`,
        ...data
    }).catch(() => { })

}