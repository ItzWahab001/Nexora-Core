

//* Noting is here 
//* go to config.mjs 


import dotenv from 'dotenv'
dotenv.config()

const Tokens = process.env.TOKEN?.split(","),
    ClientIDs = process.env.CLIENT_ID.split(",");

/**@type {import("./clientConfig.mjs").clientConfig[]} */
export default Tokens.map((t, i) => ({ TOKEN: t, CLIENT_ID: ClientIDs[i] }));