const User = require("../models/user");
const { validationResult } = require("express-validator");
var jwt = require("jsonwebtoken");
var expressJwt = require("express-jwt");

exports.signup = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Controller errors - " + errors.array()[0].msg);
    return res.status(422).json({
      error: errors.array()[0].msg,
    });
  }
  const user = new User(req.body);
  user.save((error, user) => {
    if (error) {
      return res.status(400).json({
        err: "Not able to save user in DB",
      });
    }
    res.status(201).json({
      name: user.name,
      email: user.email,
      id: user._id,
    });
  });
};

exports.signin = (req, res) => {
  const errors = validationResult(req);
  const { email, password } = req.body;
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: errors.array()[0].msg,
    });
  }
  User.findOne({ email }, (error, user) => {
    if (error) {
      return res.status(400).json({
        error: "Error occured while getting the user details",
      });
    }
    if (!user) {
      return res.status(400).json({
        error: "User Email does not exist",
      });
    }
    if (!user.authenticate(password)) {
      return res.status(401).json({
        error: "Email and password do not match",
      });
    }
    //sign in the user - create auth token
    const token = jwt.sign(
      {
        _id: user._id,
      },
      process.env.SECRET
    );
    //put token to cookie
    res.cookie("token", token, { expire: new Date() + 9999 });
    //send response to FE
    const { _id, name, email, role } = user;
    return res.status(200).json({
      token,
      user: {
        _id,
        name,
        email,
        role,
      },
    });
  });
};

exports.signout = (req, res) => {
  res.clearCookie("token");
  res.json({
    message: "user signout success",
  });
};

//Protected routes
exports.isSignedIn = expressJwt({
  secret: process.env.SECRET,
  userProperty: "auth",
});

//custom middlewares
exports.isAuthenticated = (req, res, next) => {
  let checker = req.profile && req.auth && req.profile._id == req.auth._id;
  if (!checker) {
    return res.status(403).json({
      error: "Access denied",
    });
  }
  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.profile.role === 0) {
    return res.status(403).json({
      error: "You are not admin. Access denied!!!",
    });
  }
  next();
};
