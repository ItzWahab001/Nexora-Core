import { EmbedBuilder, addSuffix } from "../../../src/utils/index.mjs";

/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
  name: "invites",
  description: "Show's you the your invites in this server",
  category: "Misc",
  cooldown: 5,
  aliases: ["inv"],
  options: [
    {
      type: "user",
      name: "@User",
      id: "user",
      required: false,
    },
  ],
  run: async ({ message, client, err, options, guildData }) => {
    try {
      const target = options.get("user") || message.author;

      const data = await client.db.FindOne("GuildMember", {
        Guild: message.guild.id,
        User: target.id,
      });

      if (!data?.Invites?.Count)
        return message.reply({
          content: `${target.username} has no invites in this server`,
        });

      message.reply({
        content: `${target.username} has ${data.Invites.Count} invites in this server`,
      });
    } catch (error) {
      err(error);
    }
  },
};
