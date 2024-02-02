import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema({

    videoFile:{
        type: String,  // cloudnary url
        required: true,
    },
    thumbnail: {
        type: String,  // cloudnary url
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    views: {
        type: Number,
        default: 0,
    },
    isPublished: {
        type: Boolean,
        default: true,
    }

},{timestamps:true});


videoSchema.plugin(mongooseAggregatePaginate);   // mongoose aggregate paginate is used to run aggregation 
                                                //  quires means complex quires required to store watch history

export const Video = mongoose.model("Video",videoSchema);