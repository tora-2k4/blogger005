const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const jwt = require("jsonwebtoken");
const Post = require("../../models/Post");
const User = require("../../models/User");
const Comment = require("../../models/Comment");
const multer = require("multer");
const fs = require("fs");
const { runInContext } = require("vm");
const upload = multer({dest:"public/images/uploads/"});

router.get("/",checkAuth,async(req,res)=>{
   try{
          const decode = jwt.verify(req.headers.token,"techApi005");
          const postCount = await Post.countDocuments({author:decode.id});
          const user = await User.findById(decode.id);
          const favCount = user.favouriteB.length;
          const giveCount = await Comment.countDocuments({commenter:decode.id});
          const getCount = await Comment.countDocuments({author:decode.id});
          res.status(200).json({
            postCount,
            favCount,giveCount,getCount,
          });
   }catch(e){
           res.status(500).json({
            message:"Internal Server Error",
           });
   }
});

router.post("/postadd",checkAuth,upload.single("image"),async(req,res)=>{
  try{
  const decode = jwt.verify(req.headers.token,"techApi005");
  const post = new Post();
  post.title = req.body.title;
  post.content = req.body.content;
  post.author = decode.id;
  if(req.file) post.image = "/images/uploads/" + req.file.filename;
  console.log(post);
  const data = await post.save();
  console.log(data);
  res.status(201).json({
    message:"Post Created",
    data:data,
  })
  }catch(e){
    console.log(e);
    res.status(500).json({
      message:"Internal Server Error",
     });
  }
})

router.get("/postlist",checkAuth,async(req,res)=>{
  try{
  const decode = jwt.verify(req.headers.token,"techApi005");
  const posts = await Post.find({author:decode.id});
  res.status(200).json({
    message:"Post List",
    posts,
  });
  }catch(e){
      res.status(500).json({
      message:"Internal Server Error",
     });
  }
});

router.get("/postdetail/:id",checkAuth,async(req,res)=>{
  try{
    const post = await Post.findById(req.params.id).populate("author");
    const comments = await Comment.find({post:post._id}).populate("commenter");
    res.status(200).json({post,comments});
   }catch(e){
    res.status(500).json({
      message:"Internal Server Error",
     });
  }
})

router.patch("/postupdate",checkAuth,upload.single("image"), async(req,res)=>{
  try{
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
    res.status(200).json({
      message:"Post Update Success",
    });
  }catch(e){
    console.log(e)
     res.status(500).json({
      message:"Internal Server Error",
     });
  }
}
);

router.delete("/postdelete/:id",checkAuth,async (req,res)=>{
  try{
  const data  = await Post.findByIdAndDelete(req.params.id);
  try{
    fs.unlinkSync("public"+data.image);
  }catch(e){
    console.log("error deleting image...",e);
  }
   res.status(200).json({
    message:"Post Delete Success",
   })
}catch(e){
  res.status(500).json({
    message:"Internal Server Error",
   });
}
})

router.post("/givecomment",checkAuth,async(req,res)=>{
  try{
    const decode = jwt.verify(req.headers.token,"techApi005");
    const comment  = new Comment();
    comment.post = req.body.pid;
    comment.comment = req.body.comment;
    comment.commenter = decode.id;
    comment.author = req.body.aid;
    const data = await comment.save();
    console.log(data);
    res.status(201).json({status:true});
  }catch(e){
    console.log(e);
    res.status(500).json({status: false});
  }
})

router.post("/givereply",checkAuth,async(req,res)=>{
  try{
    const data = await Comment.findByIdAndUpdate(
      req.body.cid,
      {$set:{ reply:req.body.reply}}
    );
    res.status(201).json({status:true});
  }catch(e){
    res.status(500).json({status:false});
  }
});

router.post("/givelike",checkAuth,async(req,res)=>{
  const decode = jwt.verify(req.headers.token,"techApi005");
  if(req.body.action == "like"){
    try{
      const data = await Post.findByIdAndUpdate(req.body.pid,{
        $push:{ like:{user:decode.id}},
      });
      res.json({status:true});
    }catch(e){
      console.log(e);
      res.json({status:false});
    }
  }else{
    try{
      const post = await Post.findById(req.body.pid);
      const likeList = post.like.filter(function(data){
        return data.user != decode.id;
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

router.post("/favaction",checkAuth,async(req,res)=>{
  const decode = jwt.verify(req.headers.token,"techApi005");
  if(req.body.action == "fav"){
    try{
      const data = await User.findByIdAndUpdate(decode.id,{
          $push:{favouriteB:{blogger:req.body.aid}},
      });
      res.json({status:true});
    }catch(e){
      console.log(e)
      res.json({status:false});
    }
  }else{
    try{
      const user = await User.findById(decode.id);
      const favlist = user.favouriteB.filter(function(data){
        return data.blogger != req.body.aid;
      });
      console.log(favlist);
      const data = await User.findByIdAndUpdate(decode.id,{
        $set:{favouriteB:favlist},
      });
      res.json({status:true});
    }catch(e){
      res.json({status:false});
    }
  }
})

router.get("/myfavblogs",checkAuth,async(req,res)=>{
  try{
  const decode = jwt.verify(req.headers.token,"techApi005");
  const user = await User.findById(decode.id);
  let favlist = [];
  user.favouriteB.forEach(function(element){
    favlist.push(element.blogger);
  });
  const posts = await Post.find({author:{$in:favlist}}).populate("author");
  res.status(200).json({
    posts,
  });
}catch(e){
  res.status(500).json({
    message:"Internal Server Error",
    error:e,
  });
}
});



module.exports = router;