const express = require('express');
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const user = require('./models/user');
const crypto = require("crypto");
const { log } = require('console');
const path = require("path");
const upload = require("./config/multerconfig");
const fs = require("fs");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));
app.use(cookieParser());


app.get("/",(req,res)=>{
    res.render("index");
});


app.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    let user = await userModel.findOne({ email: req.user.email });

    
    if (user.profilepic && user.profilepic !== "default.jpeg") {
      const oldPicPath = path.join(__dirname, "public", "images", "uploads", user.profilepic);
      if (fs.existsSync(oldPicPath)) {
        fs.unlinkSync(oldPicPath); 
      }
    }

    user.profilepic = req.file.filename;
    await user.save();

    res.redirect("/profile");
  } catch (err) {
    console.error("Error uploading DP:", err);
    res.status(500).send("Error uploading profile picture.");
  }
});



app.get("/login", (req, res) => {
  res.render("login", { error: null }); 
});



app.get("/profile",isLoggedIn, async (req,res)=>{
    let user = await userModel.findOne({email: req.user.email}).populate("posts");
    res.render("profile",{user});
});



app.get("/like/:id",isLoggedIn, async (req,res)=>{
    let post = await postModel.findOne({_id: req.params.id}).populate("user");
     
    if(post.likes.indexOf(req.user.userid)=== -1){
      post.likes.push(req.user.userid);
    }
    else{
      post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }  
     await post.save();
    res.redirect(req.get("Referer"));
});



app.get("/edit/:id",isLoggedIn, async (req,res)=>{
    let post = await postModel.findOne({_id: req.params.id}).populate("user");
     
    res.render("edit", {post});
});



app.post("/update/:id",isLoggedIn, async (req,res)=>{
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});
     
    res.redirect("/profile");
});



app.get("/delete/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id });

    
    if (post.user.toString() === req.user.userid) {
      // ✅ Delete post image file if it exists
       if (post.image) {
         const imagePath = path.join(__dirname, "public", "images", "uploads", post.image);
          if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
         }
        }

         // Delete the post and remove from user
           await postModel.deleteOne({ _id: req.params.id });
           await userModel.updateOne(
             { _id: req.user.userid },
             { $pull: { posts: req.params.id } }
           );

  res.redirect("/profile");
} else {
  res.status(403).send("Unauthorized");
}
});



app.post("/post",isLoggedIn, upload.single("postImage"), async (req,res)=>{
    let user = await userModel.findOne({email: req.user.email});
    let {content} = req.body;

    let post = await postModel.create({
      user: user._id,
      content,
      image: req.file ? req.file.filename : null
    });
    
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");

});



app.post("/register",upload.single("profilepic"), async (req,res)=>{
  let {email,password,username,name,age} = req.body;

   let user = await userModel.findOne({email});
    if (user) {
        return res.render("login", { error: "User already registered" });
       }

   bcrypt.genSalt(10,(err,salt)=>{
     bcrypt.hash(password, salt, async (err,hash)=>{
         const profilepic = req.file? req.file.filename: "default.jpeg";

          let user = await  userModel.create({
            username,
            email,
            age,
            name,
            password: hash,
            profilepic
           });

         let token = jwt.sign({email: email, userid: user._id }, "aaaa");
         res.cookie("token", token);
         res.redirect("/profile");
     });
   });
});


app.get("/register", (req, res) => {
  res.render("index");
});



app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.render("login", { error: "Something went wrong" });
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      const token = jwt.sign({ email: user.email, userid: user._id }, "aaaa");
      res.cookie("token", token);
      return res.redirect("/profile");
    } else {
      return res.render("login", { error: "Something went wrong" });
    }
  });
});



app.get("/logout",(req,res)=>{
   res.cookie("token", "");
  res.redirect("/login");
});


app.get("/feed", isLoggedIn, async (req, res) => {
    
    let posts = await postModel.find().populate("user").sort({ _id: -1 });

    
    let currentUser = await userModel.findOne({ _id: req.user.userid });

    res.render("feed", {
        posts,
        currentUser
    });
});


app.post("/delete-account", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.user.userid }).populate("posts");

    // ✅ Delete profile picture if it's not default
    if (user.profilepic && user.profilepic !== "default.jpeg") {
      const profilePicPath = path.join(__dirname, "public", "images", "uploads", user.profilepic);
      if (fs.existsSync(profilePicPath)) {
        fs.unlinkSync(profilePicPath);
      }
    }

    // ✅ Delete each post image if exists
    for (let post of user.posts) {
      if (post.image) {
        const postImgPath = path.join(__dirname, "public", "images", "uploads", post.image);
        if (fs.existsSync(postImgPath)) {
          fs.unlinkSync(postImgPath);
        }
      }
    }

    // Delete all posts and the user
    await postModel.deleteMany({ user: req.user.userid });
    await userModel.findByIdAndDelete(req.user.userid);

    res.clearCookie("token");
    res.redirect("/register");
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong while deleting account.");
  }
});



function isLoggedIn (req,res,next){
    if(req.cookies.token ==="") res.redirect("/login");
    else{
       let data = jwt.verify(req.cookies.token, "aaaa");
       req.user = data;
        next();
    }
   
}

app.listen(3000);