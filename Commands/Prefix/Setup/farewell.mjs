import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  ChannelSelectMenuBuilder,
  AttachmentBuilder,
  Message,
  Collector,
} from "discord.js";
import {
  isImageURLValid,
  EmbedBuilder,
  welcome,
} from "../../../src/utils/index.mjs";
import { welcomeCard } from "greetify";
import Bot from "../../../src/client.mjs";
import * as Themes from "../../../Assets/Global/Themes.mjs";

const cmd = {};

/**
 * @param {Object} object
 * @param {Message | import('discord.js').Interaction} object.message
 * @param {Bot} object.client
 * @param {String[]} object.args
 * @param {Object} object.Slash
 * @param err ErrorHnadler
 */
cmd.run = async ({ message, client, err, Slash, options, guildData }) => {
  try {
    const { guild } = message;
    const user = message.author || message.user;

    /** @type {import("../../../Database/-Models/GuildConfig.json")} data*/
    const data = guildData;
    const { Theme } = data;

    let homeBtn = new ButtonBuilder()
      .setCustomId("home-btn")
      .setStyle(2)
      .setLabel("Home Page");
    let msgBtn = new ButtonBuilder()
      .setCustomId("setup:farewell:message")
      .setStyle(3)
      .setLabel("Setup farewell Message");
    let TestBtn = (da) =>
      new ButtonBuilder()
        .setCustomId("setup:farewell:test")
        .setDisabled(
          da && da?.Farewell?.Enable && da?.Farewell?.Channel ? false : true
        )
        .setStyle(3)
        .setLabel("Test farewell");

    let emotes = {
      // emotes id
      del: "979818265582899240",
      rank: "979733796599529483",
      channel: "1122752979854962719",
      message: "1058313763457081435",
      levelup: "1145033013957230592",
      rewards: "1064556027837685791",
      wel: "1013056524077248512",
    };

    let emoteLink = (em) => `https://cdn.discordapp.com/emojis/${emotes[em]}`;

    const select = (disabled = false, is = data && data?.Farewell?.Enable) => {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("setup:farewell:panel")
        .setPlaceholder("Dont Make Selection!")
        .setDisabled(disabled)
        .setMaxValues(1)
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(is ? "Disable It" : "Enable It")
            .setDescription(
              `Click to ${is ? "Disable" : "Enable"} farewell System`
            )
            .setValue("EnableOrDisable")
            .setEmoji(is ? client.emotes.x : client.emotes.y),
          new StringSelectMenuOptionBuilder()
            .setLabel("Channel For farewell")
            .setDescription(`Enable/Disable/Set Channel for farewell!`)
            .setValue("channel")
            .setEmoji(emotes.channel),
          new StringSelectMenuOptionBuilder()
            .setLabel("farewell Message")
            .setDescription(`Enable/Disable/Set Message For farewell!`)
            .setValue("message")
            .setEmoji(emotes.message),
          new StringSelectMenuOptionBuilder()
            .setLabel("farewell Card")
            .setDescription(`Configure farewell Card`)
            .setValue("card")
            .setEmoji(emotes.wel)
        );

      if (is)
        menu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Reset All")
            .setEmoji(emotes.del)
            .setValue("reset")
            .setDescription("Reset farewell data")
        );

      return menu;
    };

    const row = new ActionRowBuilder().addComponents(select());
    const row2 = new ActionRowBuilder().addComponents(select(true));
    const homeRow = new ActionRowBuilder().addComponents(homeBtn);
    const testRow = (da = data) =>
      new ActionRowBuilder().addComponents(TestBtn(da));
    const msgRow = new ActionRowBuilder().addComponents(msgBtn);

    let homeEmbed = new EmbedBuilder(client)
      .setDefaultFooter()
      .setDescription(
        `**Select an option from the following list to get started!**\n\n> *${
          client.getPromotion()?.Message
        }*`
      )
      .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
      .setAuthor({
        name: "GoodBye System",
      });

    let msg = await message.safeReply({
      embeds: [homeEmbed],
      components: [row, testRow()],
    });

    /**@type {Collector} */
    const collector = msg.createMessageComponentCollector({
      componentType: 0,
      time: 240 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== user.id)
        return i.safeReply({
          content: "!{skull} You dont have permisson to do this".replaceEmojis(
            client
          ),
          ephemeral: true,
        });

      const data2 = await i.guild.fetchData();

      const load = {
        content: "",
        files: [],
        components: [],
        embeds: [
          new EmbedBuilder(client)
            .setTheme(data2.Theme)
            .setDescription("^{common.loading}"),
        ],
      };

      if (i.isAnySelectMenu()) {
        if (i.customId === "setup:farewell:panel") {
          if (i.values[0] === "EnableOrDisable") {
            await i.safeUpdate(load);

            const UpdatedData = await client.db.UpdateOne(
              "GuildConfig",
              {
                Guild: i.guild.id,
              },
              {
                $set: {
                  [`Farewell.Enable`]: data2.Farewell.Enable ? false : true,
                },
              },
              { new: true, upsert: true }
            );

            await msg.safeEdit(await home(UpdatedData));

            await i.guild.updateData();
          } else if (i.values[0] === "channel") {
            if (!data2.Farewell.Enable)
              return await i.safeReply({
                content: "Enable farewell Sytem First!",
                ephemeral: true,
              });

            let embed = new EmbedBuilder(client)
              .setDefaultFooter()
              .setThumbnail(emoteLink("channel"))
              .setDescription("*Select a channel from given channels to set!*")
              .setAuthor({
                name: "farewell Channel",
                iconURL: emoteLink("channel"),
              });

            const channelSelect = (disabled = false) =>
              new ChannelSelectMenuBuilder()
                .setCustomId("setup:farewell:channel")
                .setPlaceholder("Dont Make Selection!")
                .setDisabled(disabled)
                .setMaxValues(1)
                .setChannelTypes(0);

            const channelRow = new ActionRowBuilder().addComponents(
              channelSelect()
            );

            await i.safeUpdate({
              embeds: [embed],
              components: [channelRow, homeRow],
            });
          } else if (i.values[0] === "message") {
            if (!data2.Farewell.Enable)
              return await i.safeReply({
                content: "Enable farewell Sytem First!",
                ephemeral: true,
              });

            let embed = new EmbedBuilder(client)
              .setTheme(data2.Theme)
              .setDefaultFooter()
              .setAuthor({
                name: "Set GoodBye Message",
                url: "https://discord.gg/uoaio",
                iconURL: emoteLink("message"),
              })
              .setThumbnail(emoteLink("message"))
              .setDescription(`**Click the button below to set/update level message.**\n## Avaliable  Variables
                            - \`{user:accountcreated}\` - Returns user account created time eg: <t:${parseInt(
                              user.createdTimestamp / 1000
                            )}:R> 
                            - \`{user:mention}\` - Will Mention User eg: <@${
                              i.user.id
                            }>
                            - \`{user:username}\` - Retruns Username of user eg: uoaio
                            - \`{guild:membercount}\` - Returns number of members eg: 100
                            - \`{guild:name}\` - Returns name of server eg: ${
                              i.guild.name
                            }`);

            await i.safeUpdate({
              embeds: [embed],
              components: [msgRow, homeRow],
            });
          } else if (i.values[0] === "reset") {
            await i.safeUpdate(load);

            await client.db.UpdateOne(
              "GuildConfig",
              {
                Guild: i.guild.id,
              },
              {
                $set: {
                  Farewell: {
                    Message: "{user:username} left Sever :(",
                    Channel: "",
                    Enable: false,
                  },
                  FarewellCard: Themes[data2.Theme]?.FarewellCard,
                },
              },
              { new: true, upsert: true }
            );

            await msg.safeEdit({
              embeds: [
                new EmbedBuilder()
                  .setTheme(data2.Theme)
                  .setDescription(`!{y} Reset Successfully`),
              ],
            });

            await message.guild.updateData();
          } else if (i.values[0] === "card") {
            await i.safeUpdate(load);
            await msg.safeEdit(await card(data2));
          }
        } else if (i.customId === "setup:farewell:channel") {
          await i.safeUpdate(load);

          const UpdatedData = await client.db.UpdateOne(
            "GuildConfig",
            {
              Guild: i.guild.id,
            },
            {
              $set: {
                [`Farewell.Channel`]: i.values[0],
              },
            },
            { new: true, upsert: true }
          );

          await msg.safeEdit(await home(UpdatedData));
          await message.guild.updateData();
        }
      } else if (i.isButton()) {
        if (i.customId === "setup:farewell:message") {
          const input_1 = new TextInputBuilder()
            .setStyle(2)
            .setRequired(true)
            .setCustomId("message")
            .setLabel("farewell Message")
            .setPlaceholder("Enter some text!")
            .setMaxLength(300);
          const modal = new ModalBuilder()
            .setCustomId("setup:farewell:message:modal")
            .setTitle("farewell System")
            .addComponents(new ActionRowBuilder().addComponents(input_1));

          await i.safeShowModal(modal);

          const response = await i.awaitModalSubmit({
            filter: (i) =>
              i.customId === "setup:farewell:message:modal" &&
              i.user.id === user.id,
            time: 240 * 1000,
          });

          /// on modal submit
          if (response.isModalSubmit()) {
            response.deferUpdate();

            const UpdatedData = await client.db.UpdateOne(
              "GuildConfig",
              { Guild: guild.id },
              {
                $set: {
                  ["Farewell.Message"]:
                    response.fields.fields.get("message").value,
                },
              },
              { upsert: true, new: true }
            );

            await msg.safeEdit(await home(UpdatedData));
            await message.guild.updateData();
          }
        } else if (i.customId.includes("farewellCard:")) {
          const whichBtn = i.customId.replace("farewellCard:", "");
          if (whichBtn === "reset") {
            await i.safeUpdate(load);

            const UpdatedData = await client.db.UpdateOne(
              "GuildConfig",
              {
                Guild: i.guild.id,
              },
              {
                $set: {
                  [`FarewellCard`]: Themes[data2.Theme]?.FarewellCard,
                },
              },
              { new: true, upsert: true }
            );

            await msg.safeEdit(await card(UpdatedData));
            await message.guild.updateData();
          } else if (whichBtn === "Enable") {
            await i.safeUpdate(load);
            if (data2?.Farewell?.Card === undefined) {
              Object.setPrototypeOf(data2.Farewell, { Card: false });
            }
            data2.Farewell.Card = !data2.Farewell.Card;
            const UpdatedData = await client.db.UpdateOne(
              "GuildConfig",
              {
                Guild: i.guild.id,
              },
              {
                $set: {
                  [`Farewell`]: data2.Farewell,
                },
              },
              { new: true, upsert: true }
            );

            await msg.safeEdit(await card(UpdatedData));
          } else {
            let carD = "";

            if (whichBtn === "bg") carD = "Background";
            else if (whichBtn === "color") carD = "Color";
            else carD = "Message";

            const input_1 = new TextInputBuilder()
              .setCustomId("value")
              .setLabel(whichBtn === "bg" ? "Picture URL" : carD)
              .setRequired(true)
              .setPlaceholder(
                whichBtn === "bg" ? "Enter Valid Picture URL" : carD
              )
              .setStyle(1)
              .setMaxLength(whichBtn === "bg" ? 300 : 6);
            const modal = new ModalBuilder()
              .setCustomId("setup:farewell:card")
              .setTitle("GoodBye System")
              .addComponents(new ActionRowBuilder().addComponents(input_1));

            await i.safeShowModal(modal);

            const response = await i.awaitModalSubmit({
              filter: (i) =>
                i.customId === "setup:farewell:card" && i.user.id === i.user.id,
              time: 240 * 1000,
            });

            /// on modal submit
            if (response.isModalSubmit()) {
              let value = response.fields.fields.get("value").value;

              if (whichBtn == "color" && !/^[A-Fa-f0-9]{6}$/.test(value))
                return await response.safeReply({
                  embeds: [
                    new EmbedBuilder(client)
                      .setTheme(data2.Theme)
                      .setDescription(
                        "!{i} Kindly Provide A Vaild Hex Code. eg: 00ffaa, ffffff, 000000......"
                      ),
                  ],
                  ephemeral: true,
                });

              if (whichBtn === "bg") {
                if (!(await isImageURLValid(value)))
                  return await response.safeReply({
                    embeds: [
                      new EmbedBuilder(client)
                        .setTheme(data2.Theme)
                        .setDescription("!{i} Kindly Provide A Vaild URL."),
                    ],
                    ephemeral: true,
                  });
              }

              await response?.safeUpdate(load);

              const UpdatedData = await client.db.UpdateOne(
                "GuildConfig",
                { Guild: guild.id },
                {
                  $set: {
                    [`FarewellCard.${carD}`]: value,
                  },
                },
                { upsert: true, new: true }
              );

              await msg.safeEdit(await card(UpdatedData));
              await message.guild.updateData();
            }
          }
        } else if (i.customId === "setup:farewell:test") {
          await i.safeReply({
            content: `farewell Message will be send within few minutes! if wont work update channel`,
            ephemeral: true,
          });

          await welcome.sendFarewell(message.member, {}, data2);
        } else if (i.customId === "home-btn")
          await i.safeUpdate(await home(data2));
      }

      //* Go to main page
      async function home(data) {
        if (!data) data = await i.guild.fetchData();

        const NewRow = new ActionRowBuilder().addComponents(
          select(false, data && data.Farewell.Enable)
        );
        const NewRow2 = new ActionRowBuilder().addComponents(TestBtn(data));

        return {
          files: [],
          embeds: [homeEmbed],
          content: "",
          components: [NewRow, NewRow2],
        };
      }

      async function card(data) {
        if (!data)
          data = await client.db.FindOne("GuildConfig", {
            Guild: guild.id,
          });
        let enableBtn = new ButtonBuilder()
          .setCustomId("farewellCard:Enable")
          .setStyle(data?.Farewell?.Card ? 2 : 3)
          .setLabel(data?.Farewell?.Card ? "Disable" : "Enable");
        let bgBtn = new ButtonBuilder()
          .setCustomId("farewellCard:bg")
          .setStyle(3)
          .setLabel("Background")
          .setDisabled(!data?.Farewell?.Card);
        let boderBtn = new ButtonBuilder()
          .setCustomId("farewellCard:color")
          .setStyle(3)
          .setLabel("Color")
          .setDisabled(!data?.Farewell?.Card);
        let barBtn = new ButtonBuilder()
          .setCustomId("farewellCard:message")
          .setStyle(3)
          .setLabel("Message")
          .setDisabled(!data?.Farewell?.Card);
        let titleBtn = new ButtonBuilder()
          .setCustomId("farewellCard:title")
          .setStyle(3)
          .setLabel("Message")
          .setDisabled(!data?.Farewell?.Card);
        let DataReset = new ButtonBuilder()
          .setCustomId("farewellCard:reset")
          .setStyle(2)
          .setLabel("Reset")
          .setEmoji(emotes.del)
          .setDisabled(false);

        const CardRow = new ActionRowBuilder().addComponents(
          bgBtn,
          boderBtn,
          barBtn
        );
        const CardRow2 = new ActionRowBuilder().addComponents(
          homeBtn,
          DataReset,
          enableBtn
        );

        const welcard = await new welcomeCard()
          .setName(i.user.username)
          .setAvatar(i.user.displayAvatarURL({ format: "png" }))
          .setMessage(data.FarewellCard.Message || "GoodBye")
          .setBackground(
            data.FarewellCard.Background || "https://s6.imgcdn.dev/ZqH2S.png"
          )
          .setColor(data.FarewellCard.Color || "000000") // without #
          .setTitle("GoodBye")
          .build();

        const attachment = new AttachmentBuilder(welcard, {
          name: `card.png`,
        });

        return {
          embeds: [
            new EmbedBuilder(client)
              .setTheme(data.Theme)
              .setImage("attachment://card.png")
              .setAuthor({
                name: "farewell System",
                url: "https://youtube.com/@uoaio",
              })
              .setDescription(
                "*Click Following to update farewell Card for this server*"
              )
              .setDefaultFooter()
              .setColor(`#${data.FarewellCard.Color || "000000"}`)
              .setTimestamp(),
          ],
          files: [attachment],
          components: [CardRow, CardRow2],
        };
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
};

export default {
  // ignore: true,
  name: "setup-farewell",
  cooldown: 5,
  description: "Setup farewell for this server",
  category: "Setup",
  aliases: [
    "farewell-setup",
    "setfarewell",
    "set-wel",
    "setup-wel",
    "farewell-set",
    "wel-setup",
    "setup-goodbye",
    "goodbye-set",
    "setgoodbye",
  ],
  permissions: {
    user: ["Administrator", "SendMessages"],
    bot: ["ManageRoles", "ManageChannels"],
  },
  run: cmd.run,
};
