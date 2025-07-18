const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    postdata: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    date:{
        type: Date,
        default: Date.now
    },
    content:String,
    image: String,
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        }
    ],
    comments: [{ text: String, user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' } }]

});

module.exports = mongoose.model('post',postSchema);