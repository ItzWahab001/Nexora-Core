import Default from "../Default/index.mjs"
import emotes from "./emotes.mjs"
import embed from "./embed.mjs"
export default {
    ...Default,
    embed, emotes,
    Theme: "Blue",
    RankCard: {
        Background: "https://i.imgur.com/omNudPY.png",
        BarColor: "20b1da",
        BoderColor: "20b1da"
    },
    LevelupCard: {
        Background: "https://i.imgur.com/omNudPY.png",
        AvatarBoderColor: "20b1da",
        BoderColor: "20b1da"
    }
}

