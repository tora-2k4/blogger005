var express = require('express');
var router = express.Router();
const Post = require("../models/Post");
const multer = require("multer");
const upload = multer({dest:"public/images/uploads/"});
const Comment = require("../models/Comment");
const fs = require("fs");
const User = require('../models/User');
const { populate } = require('../models/Post');

/* GET users listing. */

const checkUser = function(req,res,next){
  if(req.session.user){
    next();
  }else{
    res.redirect("/login");
  }
};

router.get('/',checkUser,async function(req, res, next) {
      const postCount = await Post.countDocuments({author:req.session.user.id});
      const user = await User.findById(req.session.user.id);
      const favCount = user.favouriteB.length;
      const giveCount = await Comment.countDocuments({commenter:req.session.user.id});
      const getCount = await Comment.countDocuments({author:req.session.user.id});
  res.render('user/index',{postCount:postCount,favCount:favCount,giveCount:giveCount,getCount:getCount});
});

router.get("/postadd",checkUser,function(req,res){
  res.render("user/postadd");
});

router.post("/postadd",checkUser,upload.single("image"),async function(req,res){
          const post = new Post();
          post.title = req.body.title;
          post.content = req.body.content;
          post.author = req.session.user.id;
          if(req.file) post.image = "/images/uploads/" + req.file.filename;
          console.log(post);
          const data = await post.save();
          console.log(data);
          res.redirect("/user");
});

router.get("/postlist",checkUser,async function(req,res){
  const posts = await Post.find({author:req.session.user.id});
  res.render("user/postlist",{posts:posts});
});

router.get("/postdetail/:id",checkUser,async function(req,res){
  const post = await Post.findById(req.params.id).populate("author");
  const comments = await Comment.find({post:post._id}).populate("commenter");
  res.render("user/postdetail",{post:post,comments:comments});
});

router.get("/postupdate/:id",checkUser,async function(req,res){
  const post = await Post.findById(req.params.id);
  res.render("user/postupdate",{post:post});
})

router.post("/postupdate",checkUser,upload.single("image"), async function(req,res){
    const update = {
      title: req.body.title,
      content: req.body.content,
      updated: Date.now(),
      };
      if(req.file) {
      update.image = "/images/uploads/"+req.file.filename;
      const post = await Post.findById(req.body.id);
      try{
        fs.unlinkSync("public"+post.image);
      }catch(e){
        console.log("error deleting image...",e);
      }
    
      }
      const data = await Post.findByIdAndUpdate(req.body.id,{$set:update});
      console.log(data);
      res.redirect("/user/postlist");
    }
);

router.get("/postdelete/:id",checkUser,async function(req,res){
    const data  = await Post.findByIdAndDelete(req.params.id);
    try{
      fs.unlinkSync("public"+data.image);
    }catch(e){
      console.log("error deleting image...",e);
    }
    res.redirect("/user/postlist");
})

router.post("/givecomment",checkUser,async function(req,res){
  try{
    const comment  = new Comment();
    comment.post = req.body.pid;
    comment.comment = req.body.comment;
    comment.commenter = req.session.user.id;
    comment.author = req.body.aid;
    const data = await comment.save();
    console.log(data);
    res.json({status:true});
  }catch(e){
    console.log(e);
    res.json({status: false});
  }
})

router.post("/givereply",checkUser,async function(req,res){
  try{
    const data = await Comment.findByIdAndUpdate(
      req.body.cid,
      {$set:{ reply:req.body.reply}}
    );
    res.json({status:true});
  }catch(e){
    res.json({status:false});
  }
});

router.post("/giveLike",checkUser,async function(req,res){
  if(req.body.action == "like"){
    try{
      const data = await Post.findByIdAndUpdate(req.body.pid,{
        $push:{ like:{user:req.session.user.id}},
      });
      res.json({status:true});
    }catch(e){
      res.json({status:false});
    }
  }else{
    try{
      const post = await Post.findById(req.body.pid);
      const likeList = post.like.filter(function(data){
        return data.user != req.session.user.id;
      });
      const data = await Post.findByIdAndUpdate(req.body.pid,{
        $set:{like:likeList},
      });
      res.json({status:true});
    }catch(e){
      res.json({status:false});
    }
  }
})

router.post("/favaction",checkUser,async function(req,res){
  if(req.body.action == "fav"){
    try{
      const data = await User.findByIdAndUpdate(req.session.user.id,{
          $push:{favouriteB:{blogger:req.body.aid}},
      });
      res.json({status:true});
    }catch(e){
      console.log(e)
      res.json({status:false});
    }
  }else{
    try{
      const user = await User.findById(req.session.user.id);
      const favlist = user.favouriteB.filter(function(data){
        return data.blogger != req.body.aid;
      });
      console.log(favlist);
      const data = await User.findByIdAndUpdate(req.session.user.id,{
        $set:{favouriteB:favlist},
      });
      res.json({status:true});
    }catch(e){
      res.json({status:false});
    }
  }
})

router.get("/myfavblogs",checkUser,async function(req,res){
  const user = await User.findById(req.session.user.id);
  let favlist = [];
  user.favouriteB.forEach(function(element){
    favlist.push(element.blogger);
  });
  const posts = await Post.find({author:{$in:favlist}}).populate("author");
  res.render("user/favbloglist",{posts:posts});
})

module.exports = router;
