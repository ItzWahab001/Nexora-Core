
import { AttachmentBuilder, Message } from "discord.js";
import Theme from '../../../Assets/Global/Themes.mjs'
import { isImageURLValid, cache, logger } from "../../utils/index.mjs"
import Bot from '../../client.mjs'
import canvafy from "canvafy";
const { LevelUp } = canvafy


/**@type {import("./index.mjs").BasicParamHandler} */
export const LevelHandler = async (message, data) => {
    try {
        const { client, member, guild } = message;

        if (message.author.bot || message.system) return;

        const User = message.author

        if (data?.Levels == true && message.content.trim().length >= 10) {
            const randomXP = Math.floor(Math.random() * 2) + 1;

            const hasLeveledUp = await client.lvl.addXP({
                guild,
                user: User,
                xp: randomXP
            });

            if (hasLeveledUp) {

                const user = await client.lvl.fetchLevels({
                    user: User, guild
                });

                const attachments = [];

                if (data?.LevelupMessage) {
                    var levelMessage = data.LevelupMessage;

                    levelMessage = levelMessage.replace(`{user:username}`, message.author.username)
                        .replace(`{user:tag}`, message.author.tag)
                        .replace(`{user:mention}`, message.author)
                        .replace(`{user:level}`, user.level)
                        .replace(`{user:xp}`, user.xp);

                    const CardData = data.LevelupCard

                    if (data?.Cards?.RankUp) {
                        const card = await new LevelUp()
                            .setAvatar(member.avatarURL({
                                forceStatic: true,
                                extension: "png"
                            }) || member.displayAvatarURL({
                                forceStatic: true,
                                extension: "png"
                            }))
                            .setBackground("image", CardData?.Background && await isImageURLValid(CardData.Background) ? CardData.Background : Theme.LevelupCard.Background)
                            .setUsername(message.author.username)
                            .setBorder(`#${CardData ? CardData.BoderColor : Theme.LevelupCard.BoderColor}`)
                            .setAvatarBorder(`#${CardData ? CardData.AvatarBoderColor : Theme.LevelupCard.AvatarBoderColor}`)
                            .setOverlayOpacity(0.8)
                            .setLevels(user.level - 1, user.level)
                            .build();

                        const attachment = new AttachmentBuilder(card, {
                            name: `rankup-${member.id}.png`
                        });
                        attachments.push(attachment)
                    }

                    try {
                        if (data.levelupChannel) {
                            await guild.channels.fetch(data.levelupChannel)
                                ?.send({
                                    files: attachments,
                                    content: levelMessage
                                }).catch(() => { });
                        } else {
                            await message.channel.safeSend({
                                files: attachments,
                                content: levelMessage
                            });
                        }
                    } catch {
                        // await message.channel.safeSend({
                        //   files: [attachment],
                        //   content: levelMessage
                        // });
                    }
                }

                const dataRew = await client.db.FindOne('LevelRoles', {
                    Guild: guild.id,
                    Level: user.level
                })

                if (dataRew !== null) message.member.roles.add(dataRew.Role).catch((e) => { });

            }

        }

    } catch (error) {
        logger(error, "error")
    }

}