import Bot from '../../client.mjs';
import { logger } from '../../utils/index.mjs';
import { slashHandler } from '../../utils/handlers/Command.mjs';
import { TruthOrDareHandler, ReactionRoleHandler, TicketCoreHandler } from '../../utils/handlers/index.mjs';
import { InteractionType } from 'discord.js';
import { JTC_CoreHandler } from '../../utils/handlers/JoinToCreate.mjs';

//* ================================================================================
export default {
  name: "interactionCreate",
  /**
 * Event handler for the "interactionCreate" event.
 * @param {Bot} client - The Discord client instance.
 * @param {import('discord.js').Interaction} interaction - The interaction object.
 * @returns None
 */
  run: async (client, interaction) => {
    try {
      const guildData = await interaction.guild.fetchData();

      if (interaction.type === 2 || interaction.type === 4) {

        await slashHandler(interaction, guildData)

      }

      else if (interaction.type === 3 || interaction.type === 5) { // message components 3, modal 5
        await JTC_CoreHandler(interaction, guildData)
        // await TruthOrDareHandler(interaction, guildData);
        await ReactionRoleHandler(interaction, guildData);
        await TicketCoreHandler(interaction, guildData)
      }

    } catch (E) { logger(E, "error") }
  }

}