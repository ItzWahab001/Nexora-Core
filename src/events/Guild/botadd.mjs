import { Events } from "discord.js";
import { EmbedBuilder, cache } from "../../utils/index.mjs";
import Bot from "../../client.mjs";
import { invite } from "../../utils/invite.mjs";
export default {
  name: Events.GuildCreate,
  /**
   * @param {Bot} client - The Discord client.
   * @param {import('discord.js').Guild} guild
   */
  run: async (client, guild) => {
    try {
      invite.updateInvites(guild);
      await guild.fetchData();
      const owners = client.config?.Owners;
      const guildOwner = await guild.fetchOwner();
      if (owners?.length === 0) return;
      const description = `\`\`\`ansi\n[2;34m${guild.name}\nID: ${guild.id}\nOwner: ${
        guildOwner.user.username
      } - ${guildOwner.id}\nMembers: ${guild.members.cache.size}\nHumans: ${
        guild.members.cache.filter((member) => !member.user.bot).size
      }\nBots: ${
        guild.members.cache.filter((member) => member.user.bot).size
      }[0m\n\`\`\``;
      let embed = new EmbedBuilder(client)
        .setColor("DarkBlue")
        .setTitle(`New Server`)
        .setAuthor({
          name: client.user.tag,
          iconURL: client.user.displayAvatarURL({
            dynamic: true,
          }),
        })
        .setFooter({
          text: `Total: ${client.guilds.cache.size}`,
        })
        .setDescription(description);

      owners.forEach((owner) => {
        client.users.cache
          .get(owner)
          ?.safeSend({
            embeds: [embed],
          })
          .catch(() => {});
      });
    } catch (e) {
      console.log(e);
    }
  },
};
