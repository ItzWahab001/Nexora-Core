import emotes from "./emotes.mjs";
import embed from "./embed.mjs";

export default {
  Theme: "Yellow", // theme name 
  emotes, embed,

  RankCard: {
    Background: "https://i.imgur.com/QrAgq3U.png",
    BarColor: "fdf112",
    BoderColor: "fdf112"
  },

  LevelupCard: {
    Background: "https://i.imgur.com/QrAgq3U.png",
    AvatarBoderColor: "fdf112",
    BoderColor: "fdf112"
  },


  WelcomeCard: {
    Message: "You Are {guild:membercount} Member",
    Background: "https://s6.imgcdn.dev/ZqH2S.png",
    Color: "fdf112"
  },
  FarewellCard: {
    Message: "Hope You Spent Good Time With Us!",
    Background: "https://s6.imgcdn.dev/ZqH2S.png",
    Color: "fdf112"
  }
}