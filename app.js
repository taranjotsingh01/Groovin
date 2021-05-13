require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const nodemailer = require("nodemailer");
const app = express();
const paypal = require('paypal-rest-sdk');
const request = require("request");

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "ourlittlesecret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/DigiMarkDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
});

userSchema.plugin(passportLocalMongoose);


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


app.get("/dashboard", function(req, res) {
if(req.isAuthenticated()){
  res.render("dashboard");
}
else {
  res.redirect("/login");
}
});

app.post("/register", function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/dashboard");
      });
    }
  });
});


app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password

  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/dashboard");
      });
    }
  });
});


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'taranjot001464@gmail.com',
    pass: 'Simar12345$'
  }
});
app.post("/contact", function(req,res){

  var mailOptions = {
  from: 'taranjot001464@gmail.com',
  to: req.body.email,
  cc: "taranjot001464@gmail.com",
  subject: "Re:"+req.body.subject,
  text: "We have recieved this message from you\n"+req.body.message+"\n we will be in touch soon"
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});
res.redirect("/");
});

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'AUBwBxrzE_ZSCo3VpJbGOngjCbcjeciPL-wKL-5fRyxDUkF1AvHY5_LrE95UDWO_NxicbcNfJXBZqX4r', // please provide your client id here
  'client_secret': 'EGgYwu1GCI9QRg3tIdqQy2ycJE_s9iv1nIANDSC0JX5XGFhuPL_1UgG-bO7IvtzDs-WA8awirRCYvHrK' // provide your client secret here
});

app.post('/pay', (req, res) => {
  const create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
        "return_url": "http://localhost:3000/success",
        "cancel_url": "http://localhost:3000/cancel"
    },
    "transactions": [{
        "item_list": {
            "items": [{
                "name": req.body.pack,
                "sku": "001",
                "price": req.body.price,
                "currency": "USD",
                "quantity": 1
            }]
        },
        "amount": {
            "currency": "USD",
            "total": req.body.price
        },
        "description": "Hat for the best team ever"
    }]
};

paypal.payment.create(create_payment_json, function (error, payment) {
  if (error) {
      throw error;
  } else {
      for(let i = 0;i < payment.links.length;i++){
        if(payment.links[i].rel === 'approval_url'){
          res.redirect(payment.links[i].href);
        }
      }
  }
});

});

app.get('/success', (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
        "amount": {
            "currency": "USD",
            "total": "25.00"
        }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
        console.log(error.response);
        throw error;
    } else {
        console.log(JSON.stringify(payment));
        res.send('Success');
    }
});
});

app.post("/subscribe", function(req,res){
    var email = req.body.email;

   var data = {
     members : [
       {
         email_address: email,
         status: "subscribed",

       }
     ]
   };

   var jsonData = JSON.stringify(data);

    var options = {
      url: "https://us7.api.mailchimp.com/3.0/lists/92442db66b",
      method: "POST",
      headers: {
        "Authorization" : "taran1 74e981147a2f44c72d84459fcd5be161-us7"
      },
      body: jsonData

    };
    request(options, function(error, response, body) {
      if (response.statusCode === 200) {
        res.redirect("/");
      } else {
        res.send("failure");
      }
    });
});

app.get('/cancel', (req, res) => res.send('Cancelled'));

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/", function(req, res) {
  res.render("index");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
