import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';
export default {
  name: "ban",
  description: "Ban Specified Member",
  cooldown: 5,
  aliases: [],
  category: "Moderation",
  permissions: {
    user: ["BanMembers"],
    bot: ["BanMembers"]
  },
  options: [
    {
      name: "@User/UserId/Username",
      id: "user",
      required: true,
      type: "member"
    }, {
      name: "Reason",
      id: "reason",
      required: false,
      type: "string"
    }
  ],
  /** 
  * @param {Object} object
  * @param {Message | import("discord.js").Interaction} object.message - The message object.
  * @param {Bot} object.client
  * @param {String[]} object.args
  * @param err ErrorHnadler
  */
  run: async ({ message, client, err, options, guildData }) => {
    try {
      const target = options.get("user");
      const reason = options.get("reason") || "Not Specified"
      const Embed = new EmbedBuilder(client).setTheme(guildData.Theme)
      const msg = await message.safeReply({
        embeds: [
          Embed.setDescription("!{l} Baning...")
        ]
      });
      const response = await ban(message.member, target, reason);
      await msg.safeEdit({
        embeds: [
          Embed.setDescription(response)
        ]
      })
    } catch (error) {
      err(error)
    }
  },
  ban
};

async function ban(issuer, target, reason) {
  if (issuer.user.id === target.user.id) return `^{command.ban.self}`
  const response = await ModUtils.banTarget(issuer, target, reason);
  if (typeof response === "boolean") return `^{command.ban.success}\n\n- Member: <@${target.user.id}> (\`${target.user.id}\`)\n- Reason: ${reason} `;
  if (response === "BotPerm") return `^{command.ban.botPerm}`;
  else if (response === "MemberPerm") return `^{command.ban.userPerm}`;
  else return `^{command.ban.error}`;
}

