import Default from "../Default/index.mjs"
import emotes from "./emotes.mjs"
import embed from "./embed.mjs"
export default {
    ...Default,
    Theme: "Red",
    embed, emotes,

    RankCard: {
        Background: "https://i.imgur.com/gEu7Z6Q.png",
        BarColor: "fb0237",
        BoderColor: "fb0237"
    },
    
    LevelupCard: {
        Background: "https://i.imgur.com/gEu7Z6Q.png",
        AvatarBoderColor: "fb0237",
        BoderColor: "fb0237"
    }
}