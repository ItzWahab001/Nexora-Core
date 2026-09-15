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
      name: "Set/Reset",
      id: "sub",
      required: true,
      options: ["sub", "reset"],
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
        const sub = options.get("")
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
  if (issuer.user.id === target.user.id) return `!{i} You cannot ban your self`
  const response = await ModUtils.banTarget(issuer, target, reason);
  if (typeof response === "boolean") return `!{y} ${target.user.username} is banned!`;
  if (response === "BotPerm") return `!{i} I do not have permission to ban ${target.user.username}`;
  else if (response === "MemberPerm") return `!{i} You do not have permission to ban ${target.user.username}`;
  else return `!{i} Failed to ban ${target.user.username}`;
}

