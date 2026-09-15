// import en from "../../../Assets/Locales/en.mjs"
// import de from "../../../Assets/Locales/de.mjs"

import GlobalConfig from '../../../Assets/Global/config.mjs'


const Locales = {};

for (const lang of GlobalConfig.Languages) {
    const Local = await import(`../../../Assets/Locales/${lang}.mjs`)
    Locales[lang] = Local.default;
}

Object.freeze(Locales);



import "./Guild.mjs"
import "./User.mjs"
import "./Channel.mjs"
import "./replaceEmoji.mjs"
import "./Message.mjs"


String.prototype.translate = function (lang) {
    lang = Locales[lang];

    return this.replaceAll(/\^\{(.*?)\}/g, (match, key) => {

        const splited = key.split(".");
        let value = lang;

        for (const key of splited) {
            value = value?.[key];
        }



        if (typeof value === "string")
            return value;
        else
            return match;

    })

}