/** @type {import("../../../src/utils/Command.mjs").prefix} */
export default {
    name: "reload",
    cooldown: 5,
    ownerOnly: true,
    description: "Reload Bot",
    aliases: [],
    category: "OwnerOnly",
    run: async ({
        message,
        client,
        err,
        guildData
    }) => {
        try {

            await message.safeReply({
                content: "Reloading, It may take some time! "
            })

            await client.reLoad();

        } catch (error) {
            err(error)
        }
    }
};