import Bot from "../../client.mjs";
import * as Themes from "../../../Assets/Global/Themes.mjs"
import "./Guild.mjs"

/**
* * Replace Emotes
* @param {Bot | Themes} param
*/

String.prototype.replaceEmojis = function (param) {
    const emojiRegex = /!\{([^}]+)\}/g;
    const Emotes = Themes[param?.theme ?? param]?.emotes || Themes.default.emotes;

    return this.replaceAll(emojiRegex, (match, emojiKey) => {
        if (Emotes[emojiKey]) return Emotes[emojiKey];
        else return match;
    });

}