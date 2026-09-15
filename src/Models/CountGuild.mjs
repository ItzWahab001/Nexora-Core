import mongoose from 'mongoose';

const GameSchema = {
    Guild: {
        type: String
    },
    SaveUsed: {
        type: Number,
        default: 0
    },
    LastUser: {
        type: String,
        default: null
    },
    TotalScore: {
        type: Number,
        default: 0
    },
    HighScore: {
        type: Number,
        default: 0
    },
    Score: {
        type: Number,
        default: 0
    },
    SaveSlot: {
        type: Number,
        default: 1
    },
    Saves: {
        type: Number,
        default: 0
    },
    Count: {
        type: mongoose.Schema.Types.Mixed,
        default: {
            right: 0,
            rong: 0
        }
    }
};

export default GameSchema;
