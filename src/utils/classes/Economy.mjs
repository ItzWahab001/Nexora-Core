import Bot from "../../client.mjs";
import { User } from "discord.js";
class Economy {
    /**
     * @param {Bot} client 
    */
    constructor(client) {
        this.db = client.db;
        this.client = client;
    }
    /**
     * * Add a specified amount of money from a user's economy balance.
     * @param {import("discord.js").Guild} guild - The Discord guild.
     * @param {User} user - The user object.
     * @param {number} amount - The amount of money to remove.
     */
    async addMoney({ guild, user, amount }) {
        const forGlobal = !guild.client.config.Economy.Global ? guild.id : "Global";
        const data = await guild.client.db.FindOne('Economy', {
            Guild: forGlobal,
            User: user.id
        })
        if (data) {
            data.Money += amount;
            await guild.client.db.UpdateOne('Economy',
                {
                    Guild: forGlobal,
                    User: user.id
                },
                {
                    $set: {
                        Money: data?.Money
                    }
                })

        } else {
            await guild.client.db.Create('Economy', {
                Guild: forGlobal,
                User: user.id,
                Money: amount,
                Bank: 0
            })
        }
    }

    /**
     * * Removes a specified amount of money from a user's economy balance.
     * @param {import("discord.js").Guild} guild - The Discord guild.
     * @param {User} user - The user object.
     * @param {number} amount - The amount of money to remove.
     * @returns {boolean} - Returns true if the money was successfully removed, false otherwise.
     */
    async removeMoney({ guild, user, amount }) {
        const forGlobal = !guild.client.config.Economy.Global ? guild.id : "Global";
        const data = await guild.client.db.FindOne('Economy', {
            Guild: forGlobal,
            User: user.id
        })

        if (data && data.Money >= 0) {
            data.Money -= amount;
            await guild.client.db.UpdateOne('Economy',
                {
                    Guild: forGlobal,
                    User: user.id
                },
                {
                    $set: {
                        Money: data?.Money
                    }
                })
            return true;
        } else return false;

    }

    async buyItem() {
        /**
        * TODO soon....
        */
    }

    async isGlobal() {
        const is = this.client.config.Economy.Global
        return is;
    }
}

export default Economy;