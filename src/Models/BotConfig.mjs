import GlobalConfig from "../../Assets/Global/config.mjs"


const defaultConfigs = Object.assign({}, ...Object.keys(GlobalConfig.Default)
    .map(d => ({
        [d]: {
            default: GlobalConfig.Default[d],
            type: typeof GlobalConfig.Default[d]
        }
    })))

export default {
    ...defaultConfigs
}