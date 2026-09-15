import { Guild, GuildMember, User } from "discord.js";
import Bot from "../../client.mjs";
import Database from "./Database.mjs";
import { cache, getWeekNumber } from "../index.mjs"

export default class Level {
    /**
     * @param {Bot} client
     */
    constructor(client) {
        this.client = client;
        this.db = client.db;
    }
    /**
    * Adds experience points (XP) to a user in a guild.
    * @param {Object} object
    * @param {User} object.user - The user object.
    * @param {Guild} object.guild - The guild object.
    * @param {number} object.xp - The amount of XP to add.
    * @returns {Promise<boolean>} - Returns true if the user leveled up, false otherwise.
    */
    async addXP({ user, guild, xp }) {
        const userId = user.id;
        const guildId = guild.id;
        const userTag = user.username
        const level = Level.calculateLevelFromXP(xp)
        const timestamp = new Date();
        const dayKey = timestamp.toISOString().slice(0, 10); // YYYY-MM-DD
        const monthKey = timestamp.toISOString().slice(0, 7); // YYYY-MM
        const weekNumber = getWeekNumber(timestamp);
        const userAvatar = user.avatarURL({
            format: 'png',
            dynamic: true,
        }) || user.displayAvatarURL({
            format: 'png',
            dynamic: true,
        });

        const userData = await guild.client.db.FindOne('Level', {
            Guild: guildId,
            User: userId,
        });

        if (!userData) {

            await guild.client.db.Create('Level', {
                User: userId,
                Guild: guildId,
                xp,
                level,
                userAvatar,
                userTag,
                Timestamp: [
                    {
                        Day: dayKey,
                        Month: monthKey,
                        Week: weekNumber,
                        Xp: xp,
                        Level: level
                    }
                ],
            })

            return false;
        }

        const existingDayEntry = userData.Timestamp.find(entry => entry.Day === dayKey);

        if (existingDayEntry) {
            existingDayEntry.Xp += xp;
            existingDayEntry.Level = Level.calculateLevelFromXP(xp + existingDayEntry.Xp);
        } else {
            userData.Timestamp.push({
                Day: dayKey,
                Month: monthKey,
                Week: weekNumber,
                Xp: xp,
                Level: level
            });
        }

        const levelBefore = Level.calculateLevelFromXP(userData.xp);

        userData.xp += parseInt(xp, 10);
        userData.level = Level.calculateLevelFromXP(userData.xp + xp);

        await guild.client.db.UpdateOne('Level', {
            User: userId,
            Guild: guildId
        }, {
            $set: {
                xp: userData.xp,
                level: userData.level,
                lastUpdated: new Date(),
                userAvatar,
                userTag,
                Timestamp: userData.Timestamp
            }
        }, { upsert: true });


        const levelAfter = userData.level;
        // validation of level. dont want to retuns ture more then one time. 
        if (levelBefore < levelAfter) {
            const key = `Level:${guild.client.user.id}::${guildId}::${userId}::${levelAfter}`;
            if (cache.get(key)) return false;
            cache.set(key, true, 10);
            return true;
        }


        return false;
    }

    /**
    * Adds experience points (XP) to a user voice in a guild.
    * @param {Object} object
    * @param {User} object.user - The user object.
    * @param {Guild} object.guild - The guild object.
    * @param {number} object.xp - The amount of XP to add.
    * @param {number} object.time
    * @returns {Promise<boolean>} - Returns true if the user leveled up, false otherwise.
    */
    async addVoiceXP({ user, guild, xp, time }) {
        const userId = user.id;
        const guildId = guild.id;
        const userTag = user.username
        const level = Level.calculateLevelFromXP(xp);
        const timestamp = new Date();
        const dayKey = timestamp.toISOString().slice(0, 10); // YYYY-MM-DD
        const monthKey = timestamp.toISOString().slice(0, 7); // YYYY-MM
        const weekNumber = getWeekNumber(timestamp);
        const userAvatar = user.avatarURL({
            format: 'png',
            dynamic: true,
        }) || user.displayAvatarURL({
            format: 'png',
            dynamic: true,
        });

        const userData = await guild.client.db.FindOne('Level', {
            Guild: guildId,
            User: userId,
        });

        if (!userData) {
            await guild.client.db.Create('Level', {
                User: userId,
                Guild: guildId,
                Voice: {
                    xp,
                    level,
                    time,
                    connections: 1,
                    Timestamp: [{
                        Day: dayKey,
                        Month: monthKey,
                        Week: weekNumber,
                        Xp: xp,
                        Level: level
                    }]
                },
                userAvatar,
                userTag,
            })

            return false;
        }

        const existingDayEntry = userData.Voice?.Timestamp?.find(entry => entry.Day === dayKey);

        if (existingDayEntry) {
            existingDayEntry.Xp += xp;
            existingDayEntry.Level = Level.calculateLevelFromXP(xp + existingDayEntry.Xp);
        } else {
            userData.Voice?.Timestamp?.push({
                Day: dayKey,
                Month: monthKey,
                Week: weekNumber,
                Xp: xp,
                Level: level
            });
        }

        const levelBefore = Level.calculateLevelFromXP(userData?.Voice?.xp);

        userData.Voice.xp += parseInt(xp, 10);
        userData.Voice.level = Level.calculateLevelFromXP(userData.Voice.xp + xp);
        userData.Voice.time += time
        userData.Voice.connections += 1

        await guild.client.db.UpdateOne('Level', {
            User: userId,
            Guild: guildId
        }, {
            $set: {
                Voice: userData.Voice,
                lastUpdated: new Date(),
                userAvatar,
                userTag
            }
        }, { upsert: true });


        const levelAfter = userData.Voice.level;

        if (levelAfter > levelBefore) {
            if (cache.get(`userVoiceLevel:${guildId}:${userId}:${levelAfter}:${this.client.user.id}`)) return false;
            else {
                cache.set(`userVoiceLevel:${guildId}:${userId}:${levelAfter}:${this.client.user.id}`, true, 10)
                return true;
            }
        };

        return false;
    }

    /**
     * Adds a level to a user in a guild and updates their information in the database.
     * @param {Object} options - The options object.
     * @param {User} options.user - The user object.
     * @param {Guild} options.guild - The guild object.
     * @param {number} options.level - The level to add.
     * @returns {Promise<boolean>} - A promise that resolves to true if the user's information was successfully updated.
     */
    async addLevel({ user, guild, level }) {
        const userId = user.id;
        const guildId = guild.id;
        const userTag = user.username
        const userAvatar = user.avatarURL({
            format: 'png',
            dynamic: true,
        }) || user.displayAvatarURL({
            format: 'png',
            dynamic: true,
        });

        let userData = await guild.client.db.FindOne('Level', {
            Guild: guildId,
            User: userId,
        });
        if (!userData) {
            await guild.client.db.Create('Level', {
                Guild: guildId,
                User: userId,
            });
            userData = await guild.client.db.FindOne('Level', {
                Guild: guildId,
                User: userId,
            });
        }
        if (!userData) return false;
        userData.level += parseInt(level, 10);
        userData.xp = userData.level * userData.level * 10;


        const updated = await guild.client.db.UpdateOne('Level', {
            User: userId,
            Guild: guildId,
        }, {
            $set: {
                level: userData.level,
                xp: userData.xp,
                lastUpdated: new Date(),
                userAvatar,
                userTag,
            }
        }, { upsert: true, new: true })

        return updated;
    }

    /**
 * Adds a level to a user in a guild and updates their information in the database.
 * @param {Object} options - The options object.
 * @param {User} options.user - The user object.
 * @param {Guild} options.guild - The guild object.
 * @param {number} options.level - The level to add.
 * @returns {Promise<boolean>} - A promise that resolves to true if the user's information was successfully updated.
 */
    async removeLevel({ user, guild, level }) {
        const userId = user.id;
        const guildId = guild.id;
        const userTag = user.username
        const userAvatar = user.avatarURL({
            format: 'png',
            dynamic: true,
        }) || user.displayAvatarURL({
            format: 'png',
            dynamic: true,
        });

        const userData = await guild.client.db.FindOne('Level', {
            Guild: guildId,
            User: userId,
        })

        if (!userData) return false;

        if (level >= userData.level) level = userData.level;

        userData.level -= parseInt(level, 10);
        userData.xp = userData.level * userData.level * 10;


        const updated = await guild.client.db.UpdateOne('Level', {
            User: userId,
            Guild: guildId,
        }, {
            $set: {
                level: userData.level,
                xp: userData.xp,
                lastUpdated: new Date(),
                userAvatar,
                userTag,
            }
        }, { upsert: true, new: true })

        return updated;
    }

    /**
     * Sets the level of a user in a guild.
     * @param {Object} options - The options object.
     * @param {User} options.user - The user object.
     * @param {Guild} options.guild - The guild object.
     * @param {number} options.level - The level to set for the user.
     * @returns {Promise<updatedData>} The updated user data object.
     */
    async setLevel({ user, guild, level }) {
        const userId = user.id;
        const guildId = guild.id;
        const userTag = user.username
        const userAvatar = user.avatarURL({
            format: 'png',
            dynamic: true,
        }) || user.displayAvatarURL({
            format: 'png',
            dynamic: true,
        });

        const userData = await guild.client.db.FindOne('Level', {
            Guild: guildId,
            User: userId,
        })

        // if (!userData) return await this.addXP({ user, guild, xp: level * level * 10 });

        userData.level = level;
        userData.xp = level * level * 10;

        const updatedData = await guild.client.db.UpdateOne('Level', {
            User: userId,
            Guild: guildId,
        }, {
            $set: {
                level: userData.level,
                xp: userData.xp,
                lastUpdated: new Date(),
                userAvatar,
                userTag,
            }
        }, { upsert: true, new: true })

        return updatedData;
    }

    /**
     * Sets the XP for a user in a guild and updates their level, last updated date, user avatar, and user tag.
     * If the user does not exist in the guild, a new user entry will be created with the provided XP, user avatar, and user tag.
     * @param {Object} options - The options object.
     * @param {User} options.user - The user object.
     * @param {Guild} options.guild - The guild object.
     * @param {number} options.xp - The XP to set for the user.
     * @returns {Promise<updatedData>} The updated user object.
     */
    async setXP({ user, guild, xp }) {
        const userId = user.id;
        const guildId = guild.id;
        const userTag = user.username
        const userAvatar = user.avatarURL({
            format: 'png',
            dynamic: true,
        }) || user.displayAvatarURL({
            format: 'png',
            dynamic: true,
        });

        const userData = await guild.client.db.FindOne('Level', {
            Guild: guildId,
            User: userId,
        })

        if (!userData) return await this.addXP({ user, guild, xp });

        userData.xp = xp;
        userData.level = Level.calculateLevelFromXP(user.xp);

        const updatedData = await guild.client.db.UpdateOne('Level', {
            User: userId,
            Guild: guildId,
        }, {
            $set: {
                level: userData.level,
                xp: userData.xp,
                lastUpdated: new Date(),
                userAvatar,
                userTag,
            }
        }, { upsert: true, new: true })

        return updatedData;
    }

    /**
     * Fetches the user's level data for a specific guild.
     * @param {Object} options - The options object.
     * @param {GuildMember | User} options.member - The user object.
     * @param {Guild} options.guild - The guild object.
     * @param {boolean} [fetchPosition=true] - Whether to fetch the user's position in the leaderboard.
     * @returns {Promise<Object|boolean>} - The user's level data or false if the user data is not found.
     */
    async fetchLevels({ user, guild }, fetchPosition = true) {
        const userId = user?.user?.id || user?.id;
        const guildId = guild.id;

        const userData = await guild.client.db.FindOne('Level', {
            Guild: guildId,
            User: userId,
        })

        if (!userData) return false;

        if (fetchPosition === true) {
            const leaderboard = await guild.client.db.Find('Level', {
                Guild: guildId,
            }, { sort: ['xp', 'descending'] })

            userData.position = leaderboard.findIndex((i) => i.User === userId) + 1;
        }

        userData.cleanXp = userData.xp - Level.xpFor(userData.level);
        userData.cleanNextLevelXp = Level.xpFor(userData.level + 1) - Level.xpFor(userData.level);


        return userData;
    }

    /**
    * Fetches the user's Voice level data for a specific guild.
    * @param {Object} options - The options object.
    * @param {GuildMember | User} options.member - The user object.
    * @param {Guild} options.guild - The guild object.
    * @param {"connections" | "level" | "xp" | "time"} options.type - The guild object.
    * @param {boolean} [fetchPosition=true] - Whether to fetch the user's position in the leaderboard.
    * @returns {Promise<Object|boolean>} - The user's level data or false if the user data is not found.
    */
    async fetchVoiceLevels({ user, guild, type = "xp" }, fetchPosition = true) {
        const userId = user?.user?.id || user?.id;
        const guildId = guild.id;

        const userData = await guild.client.db.FindOne('Level', {
            Guild: guildId,
            User: userId,
        })

        if (!userData) return false;

        if (fetchPosition === true) {
            const leaderboard = await guild.client.db.Find('Level', {
                Guild: guildId,
            }, { sort: [`Voice.${type}`, 'descending'] })

            userData.position = leaderboard.findIndex((i) => i.User === userId) + 1;
        }

        userData.cleanXp = userData.Voice.xp - Level.xpFor(userData.Voice.level);
        userData.cleanNextLevelXp = Level.xpFor(userData.Voice.level + 1) - Level.xpFor(userData.Voice.level);

        return userData;
    }


    /**
     * Calculates the experience points required to reach the specified target level.
     * @param {number} targetLevel - The target level to calculate the experience points for.
     * @returns {number} The experience points required to reach the target level.
     */
    static xpFor(targetLevel) {
        return targetLevel * targetLevel * 10;
    }

    /**
    * Calculates the user's level based on their experience points (XP).
    * @param {number} xp - The user's total experience points.
    * @returns {number} The calculated level.
    */
    static calculateLevelFromXP(xp) {
        // Customize this calculation based on your leveling system
        return Math.floor(Math.sqrt(xp) / Math.sqrt(10));
    }

    /**
     * Finds a user in the database based on their user ID and guild ID.
     * @returns {Promise<Object>} A promise that resolves to the user object found in the database.
     */
    async findOneUser({ userId, guildId }, db) {
        return await db.FindOne('Level', {
            Guild: guildId,
            User: userId,
        });
    }
}
