import mongoose from 'mongoose';

const SocialMediaSchema = {
    SocialMedia: {
        type: String
    },
    LastFeed: {
        type: String
    },
    Guild: {
        type: String
    }
};

export default SocialMediaSchema;
