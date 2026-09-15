

//* Noting is here 
//* go to config.mjs 


import dotenv from "dotenv"
import { Snowflake } from "discord.js";
dotenv.config();

/**
* @typedef {Object} Economy
* @property {Boolean} Global
*/

/**
* @typedef {Object} Settings
* @property {Boolean} CommandLogs
* @property {Boolean} CommandErrorLogs
*/


/**
* @typedef  {Object} clientConfig
* @property {String} TOKEN
* @property {Snowflake} CLIENT_ID
* @property {String} Prefix
* @property {Snowflake[]} Owners
* @property {import("discord.js").ActivitiesOptions} Activity
* @property {import("discord.js").PresenceStatusData} Status
* @property {"Yellow" | "Blue" | "Red" | "Green"} Theme
* @property {Object} Links
* @property {String} Links.Discord
* @property {String} Links.Invite
* @property {String} Links.Patreon
* @property {Object} Commands
* @property {import("./config.mjs").CategoryValue[]} Commands.Enabled - Enable Commands By categories. leave blank to enable all
*/


/** @type {clientConfig} */
export default {
    TOKEN: "",
    CLIENT_ID: "",
    Prefix: "",
    Theme: "",
    Owners: [],
    SUPPORT_SERVER: "", // soon


    Activity: {
        name: "yoo",
        type: 4,
        state: "Love You"
    },

    Status: "dnd",

    Settings: {
        CommandLogs: true,
        CommandErrorLogs: true,
    },

    Economy: {
        Global: true,
    },

    Links: {
        Discord: "",
        Patreon: "",
        Invite: ""
    },

    Commands: {
        Enabled: [],
        Disabled: []
    }

}