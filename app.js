require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');
const cors = require('cors'); 
// const multer = require("multer");
var fs = require('fs');
var path = require('path');


const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cors());

mongoose.connect(process.env.URL, {useNewUrlParser: false});
app.use(bodyParser.json());


const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


let alpha = "";
let beta = "";

const roomSchema = {
    number: Number,
    type: String,
    occupied: String,
    email: String,
    checkIn: Date,
    checkOut: Date
};
const guestSchema = {
    email: String,
    name: String,
    contact: Number,
    address: String,
    age: Number
};
const employeeSchema = {
    name: String,
    email: String,
    address: String,
    role: String,
    salary: Number,
};
const Room = mongoose.model("Room", roomSchema);
const Guest = mongoose.model("Guest",guestSchema);
const Employee = mongoose.model("Employee",employeeSchema);

app.get("/",function(req,res){
  res.redirect("/login");
})

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/blog");
});

app.get("/login",function(req,res){
  res.render("login");
})

app.get("/register",function(req,res){
  res.render("register");
})


app.get("/home",function(req,res){
  res.render("home");
})
var multer = require('multer');
  
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});
  
var upload = multer({ storage: storage });
var imgModel = require("./model");
app.get('/images', (req, res) => {
  if(req.isAuthenticated()){
    imgModel.find({}, (err, items) => {
      if (err) {
          console.log(err);
          res.status(500).send('An error occurred', err);
      }
      else {
          res.render('imagesPage', { items: items ,beta:beta});
      }
  });
  }
  else{
    res.redirect("/login");
  }
});
app.post('/images', upload.single('image'), (req, res, next) => {
    var obj = {
        email: beta,
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        }
    }
    imgModel.create(obj, (err, item) => {
        if (err) {
            console.log(err);
        }
        else {
            res.redirect('/home');
        }
    });
});

// ROOMS AND GUESTS

app.route("/rooms")
.get(function(req, res){
  if (req.isAuthenticated()){
  Room.find(function(err, foundrooms){
    if (!err) {
      res.render("rooms", {
        foundrooms: foundrooms
        });
    } else {
      res.send(err);
    }
  });}
  else{
    res.redirect("/login");
  }
})
.post(function(req, res){
    Room.findOne({number: req.body.roomNumber}, function(err, foundRoom){
      if (foundRoom) {
          console.log("Room already exists!");
          res.redirect("/rooms");
      } else {
        const newRoom = new Room({
          number: req.body.roomNumber,
          type: req.body.roomType,
          occupied: "no",
          email: null,
          checkIn: null,
          checkOut: null
        });
        newRoom.save(function(err2){
          if (!err2){
            res.redirect("/rooms")
          } else {
            res.send(err2);
          }
        });
      }
    });
}); 

app.route("/rooms/:roomNumber")
.get( function(req, res){
  if(req.isAuthenticated()){
    const requestedPostId = req.params.roomNumber;
    Room.findOne({number: requestedPostId}, function(err, post){
      res.render("room", {
        post:post
      });
    });
  }
  else{
    res.redirect("/login");
  }
  })
.post(function(req,res){
  alpha = req.body.email;
  let decision = req.body.occupied;
  console.log(decision);
  if(decision=="no"){
    Room.updateOne(
      {number: req.params.roomNumber},
      {number: req.body.roomNumber, type: req.body.roomType, occupied: req.body.occupied, email: null, checkIn: null, checkOut: null }, 
      function(err){
        if(!err){
          res.redirect("/rooms");
        } else {
          res.send(err);
        }
      }
    );
  } 
  else{
    Guest.findOne({email: req.body.email}, function(err, foundGuest){
        if (foundGuest) {
            console.log("old guest");
            Room.updateOne(
              {number: req.params.roomNumber},
              {number: req.body.roomNumber, type: req.body.roomType, occupied: req.body.occupied, email: req.body.email, checkIn: req.body.checkIn, checkOut: req.body.checkOut }, 
              function(err){
                if(!err){
                  res.redirect("/rooms");
                } else {
                  res.send(err);
                }
              }
            );
        } else {
          Room.updateOne(
            {number: req.params.roomNumber},
            {number: req.body.roomNumber, type: req.body.roomType, occupied: req.body.occupied, email: req.body.email, checkIn: req.body.checkIn, checkOut: req.body.checkOut }, 
            function(err){
              if(!err){
                console.log("first time");
              } else {
                res.send(err);
              }
            }
          );
          res.redirect("/newGuest");
        }
      });
    }
  });

  app.route("/OccupiedRooms/:roomNumber")
  .get( function(req, res){
    if(req.isAuthenticated()){
      const requestedPostId = req.params.roomNumber;
      Room.findOne({number: requestedPostId}, function(err, post){ 
        Guest.findOne({email: post.email},function(err1,guest){
          res.render("occupiedRoom", {
            post:post,
            guest: guest
          });
        })
      });
    }
    else{
      res.redirect("/login");
    }
    })
  .post(function(req,res){
      Room.updateOne(
        {number: req.params.roomNumber},
        {number: req.body.roomNumber, type: req.body.roomType, occupied: req.body.occupied, email: req.body.email, checkIn: req.body.checkIn, checkOut: req.body.checkOut }, 
        function(err){
          if(!err){
            res.redirect("/rooms");
          } else {
            res.send(err);
          }
        }
      );
    });

    app.route("/guests")
    .get(function(req,res){ 
      if(req.isAuthenticated()){
        Guest.deleteMany({email: ""},function(err,articles){
          if (!err){
            console.log(articles);
          } else {
            res.send(err);
          }
        });
          Guest.find(function(err, foundguests){
              if (!err) {
                res.render("guests", {
                  foundguests: foundguests,
                  });
              } else {
                res.send(err);
              }
            });
      }
      else{
        res.redirect("/login");
      }
    })
    
    app.route("/newGuest")
    .get(function(req,res){
      if(req.isAuthenticated()){
        res.render("newGuest",{alpha:alpha});
      }
      else{
        res.redirect("/login");
      }
    }) 
    .post(function(req,res){
      const newGuest = new Guest({
        email: alpha,
        name: req.body.name,
        contact: req.body.contact,
        address: req.body.address,
        age: req.body.age
      });
      newGuest.save(function(err2){
        if (!err2){
          res.redirect("/rooms")
        } else {
          res.send(err2);
        }
      });
    })


// Employees

app.route("/employees")
.get(function(req,res){
  if(req.isAuthenticated()){
    Employee.find(function(err, foundemployees){
      imgModel.find(function(err,foundImages){
        if (!err) {
          res.render("employees", {
            foundemployees: foundemployees,
            foundImages: foundImages
            });
        } else {
          res.send(err);
        }
      });
      })
  }
  else{
    res.redirect("/login");
  }
})
.post(function(req,res){
          const newEmployee = new Employee({
            name: req.body.name,
            email: beta,
            role: req.body.role,
            address: req.body.address,
            salary: req.body.salary,
          });
          newEmployee.save(function(err2){
            if (!err2){
              res.redirect("/images")
            } else {
              res.send(err2);
            }
          });
        
      });



app.route("/employees/:employeeId")
.get( function(req, res){
  if(req.isAuthenticated()){
    const requestedPostId = req.params.employeeId;
    Employee.findOne({email: requestedPostId}, function(err, employee){
      imgModel.findOne({email: requestedPostId},function(err,image){
        res.render("employee", {
          employee:employee,
          image:image
        });
      })
    });
  }
  else{
    res.redirect("/login");
  }
})

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){
  beta = req.body.username;
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        console.log(beta);
        res.redirect("/employeeDetails");
      });
    }
  });

});

app.get("/employeeDetails",function(req,res){
  if(req.isAuthenticated()){
    res.render("employeeDetails",{beta:beta});
  }
})

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      });
    }
  });

});

app.listen(process.env.PORT || 2000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});