const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/miniproject");

const userSchema = mongoose.Schema({
    username: String,
    name: String,
    email: String,
    age : Number,
    password: String,
    profilepic: {
         type: String,
         default: "default.jpeg"
    },
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
             ref: "post"
        }
    ],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

})

module.exports = mongoose.model('user',userSchema);