import config from "../../../Assets/Global/config.mjs";
import { tasksWithRes } from "../../../src/utils/handlers/JoinToCreate.mjs";
import { EmbedBuilder } from "../../../src/utils/index.mjs";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  Guild,
  StringSelectMenuBuilder,
} from "discord.js";

const MAX_PANELS = 20; // The maximum number of JTC panels, Discord's limit is 25

/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
  name: "setup-jtc",
  description: "Setup JTC system for this guild",
  cooldown: 5,
  category: "Setup",
  aliases: ["jtc-set", "setup-jtc", "set-jtc"],
  permissions: {
    user: ["Administrator", "SendMessages"],
    bot: ["Administrator"],
  },

  run: async ({ message, User, client, err, options, guildData }) => {
    try {
      const user = User || message.author || message.user;
      const Embed = new EmbedBuilder(client).setTheme(guildData?.Theme);

      const startMsg = () => {
        const embed = new EmbedBuilder(client)
          .setTheme(guildData?.Theme)
          .setDescription(
            `*Select a Join-to-create panel number from the following to setup!*`
          )
          .setFooter({
            text: `Requested By: ${user.tag}`,
            iconURL: user.displayAvatarURL(),
          });

        const numbers = Array.from({ length: MAX_PANELS }, (_, i) =>
          (i + 1).toString()
        );

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("setup:jtc:panel")
            .setPlaceholder("Select A Panel")
            .addOptions(
              numbers.map((num) => ({
                label: num,
                value: num,
              }))
            )
        );

        return {
          embeds: [embed],
          components: [row],
        };
      };

      const home = (data = guildData, panelNum) => {
        const panel = data.JoinToCreate.find((x) => x?.PanelNum === panelNum);

        const selectChannel = new ChannelSelectMenuBuilder()
          .setCustomId(`setup:jtc:select:${panelNum}`)
          .setChannelTypes([ChannelType.GuildVoice])
          .setDisabled(!panel?.Enable)
          .setMaxValues(1)
          .setPlaceholder("Select A Channel");

        const selectParent = new ChannelSelectMenuBuilder()
          .setCustomId(`setup:jtc:select:parent:${panelNum}`)
          .setChannelTypes([ChannelType.GuildCategory])
          .setDisabled(!panel?.Enable)
          .setMaxValues(1)
          .setPlaceholder("Select A Category");

        const enableButton = new ButtonBuilder()
          .setCustomId(`setup:jtc:enable:${panelNum}`)
          .setStyle(panel?.Enable ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setLabel(panel?.Enable ? "Disable" : "Enable");

        const resetButton = new ButtonBuilder()
          .setCustomId(`setup:jtc:reset:${panelNum}`)
          .setDisabled(!(panel?.Enable && panel?.Channel))
          .setStyle(ButtonStyle.Danger)
          .setLabel("Reset");

        const sendPanelButton = new ButtonBuilder()
          .setCustomId(`setup:jtc:sendPanel:${panelNum}`)
          .setDisabled(!(panel?.Enable && panel?.Channel))
          .setStyle(
            panel?.Enable && panel?.Channel
              ? ButtonStyle.Primary
              : ButtonStyle.Secondary
          )
          .setLabel("Send Panel");

        const row = new ActionRowBuilder().addComponents(selectChannel);
        const row2 = new ActionRowBuilder().addComponents(selectParent);
        const row3 = new ActionRowBuilder().addComponents(
          resetButton,
          sendPanelButton,
          enableButton
        );

        return {
          embeds: [
            Embed.setAuthor({
              name: `Setup Join To Create`,
              iconURL: client.user.displayAvatarURL(),
            })
              .setDescription(
                `*Use the following menu and buttons to setup **Join To Create***\n\n${
                  panel?.Channel
                    ? `⭐ Current Channel: <#${panel.Channel}>`
                    : ""
                }\n${
                  panel?.Parent ? `⭐ Current Category: <#${panel.Parent}>` : ""
                }`
              )
              .setDefaultFooter(),
          ],
          components: [row, row2, row3],
        };
      };

      const msg = await message.reply(startMsg());

      const collector = msg.createMessageComponentCollector({
        time: 180 * 1000,
      });

      collector.on(
        "collect",
        /** * @param {import('discord.js').Interaction} i */
        async (i) => {
          const customIdSplits = i.customId.split(":");
          const panelNum = customIdSplits.pop();
          const customId = customIdSplits.join(":");
          const load = {
            embeds: [
              new EmbedBuilder(client)
                .setTheme(guildData.Theme)
                .setDescription("🔄 Loading..."),
            ],
            components: [],
          };

          if (i.user.id !== user.id) {
            return await i.reply({
              content: "💀 Access Denied.",
              ephemeral: true,
            });
          }

          // Handle panel number selection
          if (i.customId === "setup:jtc:panel") {
            await i.update(load);
            const num = i.values[0];
            const data = guildData;
            msg.edit(home(data, num));
          }

          let panel = guildData.JoinToCreate.find(
            (x) => x?.PanelNum === panelNum
          );

          if (panel === undefined) {
            guildData = await client.db.UpdateOne(
              "GuildConfig",
              {
                Guild: message.guildId,
              },
              {
                $push: {
                  ["JoinToCreate"]: {
                    PanelNum: panelNum,
                  },
                },
              },
              { upsert: true, new: true }
            );

            panel = guildData.JoinToCreate.find((x) => x.PanelNum === panelNum);
          }

          if (customId === "setup:jtc:select") {
            await i.update(load);

            panel.Channel = i.values[0];

            guildData = await client.db.UpdateOne(
              "GuildConfig",
              {
                Guild: message.guildId,
              },
              {
                $set: {
                  ["JoinToCreate"]: guildData.JoinToCreate,
                },
              },
              { upsert: true, new: true }
            );

            await msg.edit(home(guildData, panelNum));
            await i.guild.updateData();
          }

          if (customId === "setup:jtc:select:parent") {
            await i.update(load);

            panel.Parent = i.values[0];

            guildData = await client.db.UpdateOne(
              "GuildConfig",
              {
                Guild: message.guildId,
              },
              {
                $set: {
                  ["JoinToCreate"]: guildData.JoinToCreate,
                },
              },
              { upsert: true, new: true }
            );

            await msg.edit(home(guildData, panelNum));
            await i.guild.updateData();
          } else if (customId === "setup:jtc:enable") {
            await i.update(load);

            guildData = await client.db.UpdateOne(
              "GuildConfig",
              {
                Guild: message.guildId,
                ["JoinToCreate.PanelNum"]: panelNum,
              },
              {
                $set: {
                  ["JoinToCreate.$.Enable"]: !panel?.Enable,
                },
              },
              { upsert: true, new: true }
            );

            await msg.edit(home(guildData, panelNum));
            await i.guild.updateData();
          } else if (customId === "setup:jtc:reset") {
            await i.update(load);

            guildData = await client.db.UpdateOne(
              "GuildConfig",
              {
                Guild: message.guildId,
              },
              {
                $set: {
                  ["JoinToCreate"]: guildData.JoinToCreate.map((x) =>
                    x.PanelNum === panelNum ? { PanelNum: x.PanelNum } : x
                  ),
                },
              },
              { upsert: true, new: true }
            );

            guildData = await i.guild.fetchData();

            await msg.edit(home(guildData, panelNum));
            await i.guild.updateData();
          } else if (customId === "setup:jtc:sendPanel") {
            const row = new ActionRowBuilder().setComponents(
              new ChannelSelectMenuBuilder()
                .setCustomId(`setup:jtc:panel:channel:${panelNum}`)
                .setChannelTypes([ChannelType.GuildText])
                .setMaxValues(1)
                .setPlaceholder("Select A Channel")
            );

            await i.update({
              components: [row],
            });
          } else if (customId === "setup:jtc:panel:channel") {
            await i.update(load);

            const channel = message.guild.channels.cache.get(i.values.shift());

            channel
              .send({
                ...jtcPanel(message.guild, guildData),
              })
              .then(async (m) => {
                const existingPanel = panel;
                if (
                  existingPanel &&
                  existingPanel.Channel &&
                  existingPanel.Message
                ) {
                  message.guild.channels.cache
                    .get(existingPanel.Channel)
                    ?.messages.delete(existingPanel.Message)
                    .catch(() => {});
                }

                panel.Panel = {
                  //? panel for users to handle jtc
                  Channel: channel.id,
                  Message: m.id,
                };

                guildData = await client.db.UpdateOne(
                  "GuildConfig",
                  {
                    Guild: message.guildId,
                    ["JoinToCreate.PanelNum"]: panelNum,
                  },
                  {
                    $set: {
                      ["JoinToCreate.$.Panel"]: panel.Panel,
                    },
                  },
                  { upsert: true, new: true }
                );

              await msg.edit(home(guildData, panelNum));

                await i.guild.updateData();
              });
          }
        }
      );

      collector.on("end", async () => {
        await msg
          .edit({
            embeds: [
              new EmbedBuilder(client)
                .setTheme(guildData?.Theme)
                .setDescription("💀 **Timeout!** Run Command Again."),
            ],
            files: [],
            content: "",
            components: [],
          })
          .catch(() => {});
      });
    } catch (error) {
      err(error);
    }
  },
};

/**
 * Generate the JTC panel embed and components
 * @param {Guild} guild
 * @param {object} guildData
 * @returns {import('discord.js').ReplyOptions}
 */
function jtcPanel(guild, guildData) {
  const actions = config.JoinToCreate.Actions.filter(
    (x) => !tasksWithRes.includes(x)
  ).map((a) => `\`${guildData.Prefix}voice ${a}\``);
  const Embed = new EmbedBuilder()
    .setTheme(guildData.Theme)
    .setAuthor({
      name: "Temporary Voice Dashboard",
      iconURL: guild.iconURL(),
    })
    .setDefaultFooter()
    .setDescription(
      `Click on the Button to Control your Temporary Channel or perform actions with commands\n>>> ${actions.join(
        "\n"
      )}`
    )
    .setTimestamp();

  const Menu = new StringSelectMenuBuilder()
    .setCustomId("jtc:Permit:Menu")
    .setMaxValues(1)
    .setMinValues(1)
    .setPlaceholder("Permit Users")
    .addOptions([
      { label: "0", value: "0" },
      { label: "1", value: "1" },
      { label: "2", value: "2" },
      { label: "3", value: "3" },
      { label: "4", value: "4" },
    ]);

  for (let i = 5; i <= 95; i += 5) {
    Menu.addOptions([{ label: `${i}`, value: `${i}` }]);
  }

  const RowOne = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1079515867374698538")
      .setLabel("Lock")
      .setCustomId("jtc:Lock"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1079515869320855624")
      .setLabel("Unlock")
      .setCustomId("jtc:UnLock"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1084858277730455683")
      .setLabel("Hide")
      .setCustomId("jtc:Hide"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1084859746605076480")
      .setLabel("Unhide")
      .setCustomId("jtc:UnHide")
  );

  const RowTwo = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1079515864891674694")
      .setLabel("Mute")
      .setCustomId("jtc:Mute"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1079515872118444062")
      .setLabel("Unmute")
      .setCustomId("jtc:Unmute"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1084915797463404614")
      .setLabel("Permit Users")
      .setCustomId("jtc:Permit"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Danger)
      .setEmoji("1079515860516999290")
      .setLabel("Disconnect")
      .setCustomId("jtc:Disconnect")
  );

  const RowThree = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1085174405895835699")
      .setLabel("Users Manager")
      // .setDisabled(true) // TODO: Implement user management
      .setCustomId("jtc:Users"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setEmoji("1079515862928740363")
      .setLabel("Delete Channel")
      .setCustomId("jtc:Delete"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      // .setEmoji("🗒️")
      .setLabel("Rename")
      .setCustomId("jtc:Rename")
  );

  const RowFour = new ActionRowBuilder().addComponents([Menu]);

  return {
    embeds: [Embed],
    components: [RowOne, RowTwo, RowThree, RowFour],
  };
}
