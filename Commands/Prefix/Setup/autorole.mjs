import EmbedBuilder from "../../../src/utils/classes/EmbedBuilder.mjs";
import {
  roleMention,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  ButtonBuilder,
  Message,
} from "discord.js";

export default {
  name: "setup-autoroles",
  category: "Setup",
  cooldown: 5,
  description: "Setup auto roles in server. add Roles to user when they join",
  aliases: [
    "set-ar",
    "setup-auto-roles",
    "setar",
    "set-autorole",
    "setup-ar",
    "autorole-setup",
  ],
  permissions: {
    user: ["Administrator", "SendMessages"],
    bot: ["ManageRoles"],
  },
  /**
   * @param {Message | import('discord.js').Interaction} message
   * @param {Bot} client
   * @param {String[]} args
   * @param {Object} Slash
   * @param {Map} options
   * @param err ErrorHnadler
   */
  run: async ({ message, client, err, Slash, options, guildData }) => {
    try {
      if (Slash && Slash.is) await message.deferReply({ fetchReply: true });
      const user = message.author || message.user;

      const data = guildData;

      const roleSelect = (disabled = false) =>
        new RoleSelectMenuBuilder()
          .setCustomId(`setup:autoroles`)
          .setPlaceholder("^{common.click_here}")
          .setDisabled(disabled)
          .setMaxValues(1);

      let resetBtn = (isdata = data) =>
        new ButtonBuilder()
          .setCustomId("setup:autoroles:reset")
          .setStyle(2)
          .setLabel("^{common.reset}")
          .setEmoji("979818265582899240")
          .setDisabled(isdata?.AutoRoles?.Enable ? false : true);

      let enableBtn = (isdata = data) =>
        new ButtonBuilder()
          .setCustomId("setup:autoroles:Enable")
          .setStyle(2)
          .setLabel(
            `${
              isdata?.AutoRoles?.Enable
                ? "^{common.disable}"
                : "^{common.enable}"
            }`
          );

      const row = (dis = false) =>
        new ActionRowBuilder().addComponents(roleSelect());

      const row2 = (isdata = data) =>
        new ActionRowBuilder().addComponents(
          enableBtn(isdata),
          resetBtn(isdata)
        );

      let emebd = (d = data) => {
        let des = "^{command.autorole.description}";

        if (d && d.AutoRoles.Roles) {
          let maped = d.AutoRoles.Roles.map(
            (i, index) => `${index + 1}. ${roleMention(i)}`
          );
          if (maped.length > 0) des += `\n\n**List**\n${maped.join("\n")}`;
        }

        des += `\n\n> *${client.getPromotion()?.Message}*`;

        return new EmbedBuilder(client)
          .setTheme(data.Theme)
          .setAuthor({
            name: "^{command.autorole.title}",
          })
          .setDescription(des)
          .setThumbnail(
            "https://cdn.discordapp.com/emojis/1068024801186295808.gif"
          )
          .setDefaultFooter()
          .setTimestamp();
      };

      let msg = await message[Slash?.is ? "safeEdit" : "safeReply"]({
        components: [row(), row2()].map((x) => x.toJSON()),
        embeds: [emebd()],
      });

      const collector = msg.createMessageComponentCollector({
        componentType: 0,
        time: 240 * 1000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== user.id)
          return await i.safeReply({
            content: "^{common.no_auth_components}",
            ephemeral: true,
          });

        const data2 = await i.guild.fetchData();

        const wait = async () =>
          await i.safeUpdate({
            embeds: [
              new EmbedBuilder(client)
                .setTheme(data.Theme)
                .setDescription("^{common.loading}"),
            ],
            components: [],
          });

        if (i.customId === "setup:autoroles") {
          if (!data2.AutoRoles.Enable)
            return await i.safeReply({
              content: "^{command.autorole.enable_first}",
              ephemeral: true,
            });

          const role = i.guild.roles.cache.get(i.values[0]);
          const myPositon = i.guild.members.me.roles.highest.position;

          if (role.position >= myPositon)
            return i.safeReply({
              content: "^{command.autorole.high_role}",
              ephemeral: true,
            });
          else if (role.tags && role.tags.botId)
            return i.safeReply({
              content:
                "^{command.autorole.bot_role} - <@" + role.tags.botId + ">",
              ephemeral: true,
            });

          let isRoleExits = data2?.AutoRoles?.Roles?.find((y) => y === role.id);

          if (isRoleExits) {
            await wait();

            let filterd = data2.AutoRoles.Roles.filter((y) => y !== role.id);

            const data4 = await client.db.UpdateOne(
              "GuildConfig",
              {
                Guild: i.guild.id,
              },
              {
                $set: {
                  ["AutoRoles.Roles"]: filterd,
                },
              },
              { upsert: true, new: true }
            );

            await msg.safeEdit({
              components: [row(data4), row2(data4)].map((x) => x.toJSON()),
              embeds: [emebd(data4)],
            });

            await i.guild.updateData();
          } else {
            if (data2 && data2?.Roles?.length >= 5) {
              return await i.safeReply({
                content: `^{command.autorole.limit_exceeded} ${data2.Roles.length}/5`,
                ephemeral: true,
              });
            } else {
              await wait();
              await msg.safeEdit({
                embeds: [
                  new EmbedBuilder(client).setDescription("^{common.loading}"),
                ],
                components: [],
              });

              data2.AutoRoles.Roles.push(role.id);

              const data4 = await client.db.UpdateOne(
                "GuildConfig",
                {
                  Guild: i.guild.id,
                },
                {
                  $set: {
                    ["AutoRoles.Roles"]: data2.AutoRoles.Roles,
                  },
                },
                { upsert: true, new: true }
              );

              await msg.safeEdit({
                components: [row(false), row2(data4)].map((x) => x.toJSON()),
                embeds: [emebd(data4)],
              });

              await i.guild.updateData();
            }
          }
        } else if (i.customId === "setup:autoroles:Enable") {
          await wait();

          const data3 = await client.db.UpdateOne(
            "GuildConfig",
            {
              Guild: i.guild.id,
            },
            {
              $set: {
                ["AutoRoles.Enable"]: data2.AutoRoles.Enable ? false : true,
              },
            },
            { upsert: true, new: true }
          );

          await msg.safeEdit({
            components: [row(false), row2(data3)],
            embeds: [emebd(data3)],
          });
          await i.guild.updateData();
        } else if (i.customId === "setup:autoroles:reset") {
          await wait();

          const data4 = await client.db.UpdateOne(
            "GuildConfig",
            {
              Guild: i.guild.id,
            },
            {
              $set: {
                ["AutoRoles"]: {
                  Enable: false,
                  Roles: [],
                },
              },
            },
            { upsert: true, new: true }
          );

          await msg.safeEdit({
            components: [row(false), row2(data4)],
            embeds: [emebd(data4)],
          });
          await i.guild.updateData();
        }
      });

      collector.on("end", async (i) => {
        await msg
          .safeEdit({
            embeds: [
              new EmbedBuilder(client)
                .setTheme(data.Theme)
                .setDescription("^{common.timeout}"),
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
