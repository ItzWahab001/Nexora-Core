import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import EmbedBuilder from "../../../src/utils/classes/EmbedBuilder.mjs";
import Prefix from "../../Prefix/Misc/setPrefix.mjs";
import { getWarnData } from "../../../src/utils/automod.mjs";

/**@type {import('../../../src/utils/Command.mjs').interaction} */
export default {
  category: "Moderation",
  data: new SlashCommandBuilder()
    .setName("strikes-remove")
    .setDescription("Update Server Prefix!")
    .addNumberOption((op) =>
      op
        .setName("number")
        .setDescription("numbers to remove")
        .setMinValue(1)
        .setMaxValue(5)
        .setRequired(true)
    )
    .addUserOption((op) =>
      op
        .setName("user")
        .setDescription("user to remove strikes from")
        .setRequired(true)
    )
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 10,
  run: async ({ interaction, client, err }) => {
    try {
      let number = interaction.options.getNumber("number");
      let user = interaction.options.getMember("user");
      const data = await getWarnData(interaction.guild, user);

      if (data.Strikes < number) {
        number = data.Strikes;
      }

      data.Strikes -= number;
      await data.save();
      await interaction.safeReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Strike Update")
            .setDescription(
              `Removed \`${number}\` strike${
                number > 1 ? "s" : ""
              } from ${user.toString()}`
            )
            .setColor("Green"),
        ],
      });
    } catch (error) {
      err(error);
    }
  },
};
