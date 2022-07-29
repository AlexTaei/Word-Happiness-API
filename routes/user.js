var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");

var moment = require('moment'); // require
moment().format();

// Register
router.post("/register",function(req,res,next){
  const email = req.body.email
  const password = req.body.password

  if (!email||!password){
    res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required"
    })
    return
  }
  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  queryUsers
    .then((users)=>{
      if(users.length>0){
        res.status(409).json({
          error: true,
          message: "User already exists"
        })
        return
      }
      const saltRounds = 10
      const hash = bcrypt.hashSync(password, saltRounds)
      return req.db.from("users").insert({email, hash})
      .then(()=>{
      res.status(201).json({message: "User created" })
    })
  })
})


// Login
router.post("/login", function(req, res, next){
  const email = req.body.email
  const password = req.body.password

  if (!email || !password){
    res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required"
    })
    return
  }

  const queryUsers= req.db.from("users").select("*").where("email","=", email)
  queryUsers
  .then((users)=>{
    if (users.length ==0){
      res.status(401).json({
        error: true,
        message: "Incorrect email or password"
      })
      return
    }

    const user = users[0]
    return bcrypt.compare(password, user.hash)
  })
  .then((match)=>{
    if (!match){
      res.status(401).json({
        error: true,
        message: "Incorrect email or password"
      })
      return
    }
    
    const secretKey = "secret key"
    const expires_in = 60*60*24
    const exp = Date.now() + expires_in * 1000
    const token = jwt.sign({email,exp}, secretKey)
    res.status(200).json({token_type: "Bearer", token, expires_in})
  })
})

const authorize = (req, res, next) =>{
  const authorization = req.headers.authorization
  let token = null;

  if (authorization && authorization.split(" ").length ==2){
    token = authorization.split(" ")[1]
    console.log("Token: ", token)
  } else{
    res.status(401).json({
      error: true,
      message: "Authorization header ('Bearer token') not found"
    })
    return
  }

  try{
    const secretKey = "secret key"
    const decoded = jwt.verify(token, secretKey)
    if (decoded.exp < Date.now()){
      res.status(401).json({
        error: true,
        message: "Login session expired"
      })
      return
    }
    next(); 
  }
    catch (e){
    res.status(401).json({
      error: true,
      message: "Authorization header ('Bearer token') not found"
    })
  }
}


// Get profile
router.get("/:email/profile", function(req, res, next){
  if (req.headers.authorization != null){
    const authorization = req.headers.authorization
    let token = null;

    if (authorization && authorization.split(" ").length ==2){
      token = authorization.split(" ")[1]
      console.log("Token: ", token)
    }
    const secretKey = "secret key"
    const decoded = jwt.verify(token, secretKey)
    if(decoded.exp <Date.now()){
      res.status(401).json({
        error: true,
        message: "JWT token has expired"
      })
    }
    const queryUsers = req.db.from("users").select("*").where("email", "=", req.params.email)
    queryUsers
    .then((users)=>{
      if(users.length>0){
        if (decoded.email == req.params.email){
        req.db.from("users").select('email','firstName','lastName','dob','address').where("email", "=", decoded.email)
        .then((row)=>res.send(row[0]))
        .catch(err=>
        res.status(404).json({
          error: true,
          message: "User not found"
        }))
        } else{
          req.db.from("users").select('email','firstName','lastName').where("email", "=", req.params.email)
          .then((row)=>res.send(row[0]))
          .catch(err=>
          res.status(404).json({
          error: true,
          message: "User not found"
      }))
        } 
      }
      else {
          res.status(404).json({
            error: true,
            message: "User not found"
          })
        }
    })
  } else{
    const queryUsers = req.db.from("users").select("*").where("email", "=", req.params.email)
    queryUsers
    .then((users)=>{
      if(users.length>0){
        req.db.from("users").select('email','firstName','lastName').where("email", "=", req.params.email)
    .then((row)=>res.send(row[0]))
    .catch(err=>
      res.status(404).json({
        error: true,
        message: "User not found"
      }))
      } else{
        res.status(404).json({
          error: true,
          message: "User not found"
        })
      }
    })
  } 
})



function check(string){
  return /^[A-Za-z]+$/.test(string)
}

function correctDate(string){
  return /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/.test(string)
}

// PUT update profile
router.put("/:email/profile",authorize, function (req, res, next){
  const date = new Date (req.body.dob)
  const event = new Date (Date.now())
  if(!req.body.firstName||!req.body.lastName||!req.body.dob||!req.body.address){
    res.status(400).json({
      error: true,
      message: 'Request body incomplete: firstName, lastName, dob and address are required.'
    })
  }if(!check(req.body.firstName)||!check(req.body.lastName)||!(typeof req.body.address === 'string')){
    return res.status(400).json({
      error: true,
      message: "Request body invalid, firstName, lastName and address must be strings only."
    })
  }
  if(!correctDate(req.body.dob)){
    res.status(400).json({
      error: true,
      message: "Invalid input: dob must be a real date in format YYYY-MM-DD."
    })
  }
  if(date.toISOString()>event.toISOString()){
    res.status(400).json({
      error: true,
      message: "Invalid input: dob must be a date in the past."
    })
  }
  if(!moment(req.body.dob, "YYYY-MM-DD", true).isValid()){
    res.status(400).json({
      error: true,
      message: "Invalid input: dob must be a real date in format YYYY-MM-DD."
    })
  }
  const authorization = req.headers.authorization
  let token = null;
  if (authorization && authorization.split(" ").length ==2){
    token = authorization.split(" ")[1]
  }
  const secretKey = "secret key"
  const decoded = jwt.verify(token, secretKey)

  if(decoded.email == req.params.email){
    const change ={
      "firstName": req.body.firstName,
      "lastName": req.body.lastName,
      "dob": req.body.dob,
      "address": req.body.address
    }
    const print ={
      "email": req.params.email,
      "firstName": req.body.firstName,
      "lastName": req.body.lastName,
      "dob": req.body.dob,
      "address": req.body.address
    }
    req.db.from("users").where("email", "=", decodeURIComponent(req.params.email)).update(change)
    .then(res.json(print))
    .catch((err)=>{
      res.status(403).json({
        error: true,
        message: "Forbidden"
      })
    })
  } else{
    res.status(403).json({
      error: true,
      message: "Forbidden"
    })
  }
  
 
})

module.exports = router;
