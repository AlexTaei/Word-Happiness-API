var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./../docs/swaggeredited.json');

router.use('', swaggerUi.serve);
router.get('', swaggerUi.setup(swaggerDocument));

// Countries endpoint
router.get("/countries", function(req,res, next) {
  req.db.distinct("country").pluck("country").from('rankings')
  .then((rows)=> res.json(rows.sort()))
  .catch((err) => {
  console.log(err);
  res.status(400).json({error : true, message : "Invalid country format. Country query parameter cannot contain numbers."})
  })
 });

 function hasNumber(myString) {
  return /\d/.test(myString);
}
function correctYear(myString){
  if(myString.length == 4){
    return true
  } else{
    return false
  }
}

 // Rankings endpoint
 router.get("/rankings",function(req,res,next) {
   const { year, country, ...remaining} = req.query;
   if( Object.keys(remaining).length>0){
    res.status(400).json({
      error: true,
      message: "Invalid query parameters. Only year and country are permitted."
    })
   } else{
       req.db.from('rankings').select('rank','country','score','year').orderBy('year', 'desc').where((builder)=>{
    if (req.query.year){
      if (correctYear(req.query.year)){
        builder.where('year', '=', req.query.year)
      } else{
        res.status(400).json({
          error: true,
          message: "Invalid year format. Format must be yyyy."
        })
      }
    }
    if (req.query.country){
      if(hasNumber(req.query.country)){
        res.status(400).json({
          error: true,
          message: "Invalid country format. Country query parameter cannot contain numbers."
        })
      } else{
        builder.where('country', '=', req.query.country)
      }
    }
  })
  .then((rows) => res.json(rows))
  .catch((err) => {
  console.log(err);
  res.status(400).json({"Error" : true, "Message" : "Error executing MySQL query"})
  })
   }
 });

 // Authorization
const authorize = (req, res, next) =>{
  if(!req.headers.authorization){
    res.status(401).json({
      error: true,
      message: "Authorization header ('Bearer token') not found"
    })
  }
  const authorization = req.headers.authorization
  let token = null;
  

  if (authorization && authorization.split(" ").length ==2){
    token = authorization.split(" ")[1]
    console.log("Token: ", token)
  } else{
    res.status(401).json({
      error: true,
      message: "Authorization header is malformed"
    })
    return
  }

  try{
    const secretKey = "secret key"
    const decoded = jwt.verify(token, secretKey)
    if (decoded.exp < Date.now()){
      res.status(401).json({
        error: true,
        message: "JWT token has expired"
      })
      return
    }
    next();  
  }
    catch (e){
    res.status(401).json({
      error: true,
      message: "Invalid JWT token"
    })
  }
}

function correctLimit(myString){
  return /^[1-9]\d*$/.test(myString);
}

 // Factors endpoint
 router.get("/factors/:Year",authorize, function(req,res, next) {
  const { limit, country, ...remaining} = req.query;
  if( Object.keys(remaining).length>0){
   res.status(400).json({
     error: true,
     message: "Invalid query parameters. Only year and country are permitted."
   })
  }
  if (req.query.limit == undefined){
    if(correctYear(req.params.Year)){
      req.db.from('rankings')
      .select('rank','country','score','economy','family','health','freedom','generosity','trust')
      .where('Year', '=', req.params.Year)
      .where((builder)=>{
        if (req.query.country){
          if(hasNumber(req.query.country)){
            res.status(400).json({
              error: true,
              message: "Invalid country format. Country query parameter cannot contain numbers."
            })
          } else{
            builder.where('country', '=', req.query.country)
          }
        }
      })
      .limit(req.query.limit)
      .then((rows) => res.json(rows))
      .catch((err) => {
      console.log(err);
      res.status(400).json({"Error" : true, "Message" : "Error executing MySQL query"})
      })
} else{
  res.status(400).json({
    error: true,
    message: "Invalid year format. Format must be yyyy."
  })
}
  } else if (req.query.limit !=undefined){
    if (!correctLimit(req.query.limit)){
      res.status(400).json({
        error: true,
        message: "Invalid limit query. Limit must be a positive number."
      })
    } else{
      if(correctYear(req.params.Year)){
        req.db.from('rankings')
        .select('rank','country','score','economy','family','health','freedom','generosity','trust')
        .where('Year', '=', req.params.Year)
        .where((builder)=>{
          if (req.query.country){
            if(hasNumber(req.query.country)){
              res.status(400).json({
                error: true,
                message: "Invalid country format. Country query parameter cannot contain numbers."
              })
            } else{
              builder.where('country', '=', req.query.country)
            }
          }
        })
        .limit(req.query.limit)
        .then((rows) => res.json(rows))
        .catch((err) => {
        console.log(err);
        res.status(400).json({"Error" : true, "Message" : "Error executing MySQL query"})
        })
  } else{
    res.status(400).json({
      error: true,
      message: "Invalid year format. Format must be yyyy."
    })
  }
    }
  }
}); 

module.exports = router;
