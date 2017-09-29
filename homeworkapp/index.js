const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const YAML = require('yamljs')
const fs = require('fs')
const request = require('request')

var jsonParser = bodyParser.json();
var errorMsg = ""

function validatePlusOneRequest(param){
  if (isNaN(param)) {
    errorMsg = "Parameter is not a number"
  } else {
    param = parseFloat(param)
    if ((param % 1) !== 0) {
      errorMsg = "Parameter is not an integer"
    } else {
      if (param < 0) {
        errorMsg = "Parameter is not a positive integer"
      } else {
        return ++param;
      }
    }
  }
  return -1;
}
app.all('/api/plus_one/:targetNumber', function (req, res) {
  var incrementedNumber = validatePlusOneRequest(req.params.targetNumber)
  var responseObject = {}
  if (req.method !== "GET") {
    errorMsg = "Can not call API with other method type except GET"
    responseObject.detail = errorMsg
    responseObject.status = 405
    responseObject.title = "Method Not Allowed"
    res.status(405).send(responseObject);
  }
  var incrementedNumber = validatePlusOneRequest(req.params.targetNumber)
  var responseObject = {}
  if (incrementedNumber === -1) {
    responseObject.detail = errorMsg
    responseObject.status = 404
    responseObject.title = "Not Found"
    res.status(404).send(responseObject);
  } else {
    var yamlObj = YAML.load('spesifikasi.yaml');
    var apiVersion = parseFloat(yamlObj.info.version)
    responseObject.plusoneret = incrementedNumber
    responseObject.apiversion = apiVersion
    res.status(200).send(JSON.stringify(responseObject))
  }
  errorMsg = "";
})


app.all('/api/hello', jsonParser, function(req, res){
  var responseObject = {}
  if (req.method !== "POST") {
    errorMsg = "Can not call API with other method type except POST"
    responseObject.detail = errorMsg
    responseObject.status = 405
    responseObject.title = "Method Not Allowed"
    res.status(405).send(responseObject);
  } else {
    if (!req.body.request) {
      errorMsg = "'request' is a required property"
      responseObject.detail = errorMsg
      responseObject.status = 400
      responseObject.title = "Bad Request"
      res.status(400).send(responseObject);
    } else {
      responseObject.currentVisit = new Date()
      var yamlObj = YAML.load('spesifikasi.yaml');
      var apiVersion = parseFloat(yamlObj.info.version)
      responseObject.apiversion = apiVersion
      var responseString = "Good "
      var jobs = []
      request.get('http://172.17.0.70:17088/', function(error, response, body){
        if(error){
          errorMsg = "Error when getting server time"
          responseObject.detail = errorMsg
          responseObject.status = 504
          responseObject.title = "Gateway Timeout"
          res.status(504).send(responseObject);

        }
        var timeJson = JSON.parse(body)
        responseString += timeJson.state
        responseString = responseString + " "+req.body.request
        responseObject.response = responseString

        fs.readFile('count.json', 'utf8', function(err, data){
            if (err) {
              errorMsg = "Error when counting API call"
              responseObject.detail = errorMsg
              responseObject.status = 500
              responseObject.title = "Internal Server Error"
              res.status(504).send(responseObject);
            } else {
              data = JSON.parse(data)
              data.count++;
              responseObject.count = data.count
              data = JSON.stringify(data)
              fs.writeFile('count.json', data, 'utf8', function(err){
                res.status(200).send(responseObject)
              })
            }
        })
      })
    }
  }
});

app.get('/api/spesifikasi.yaml', function(req, res){
  res.sendFile(__dirname+'/spesifikasi.yaml')
});

app.all('*', function(req, res){
  var responseObject = {}
  responseObject.detail = "The requested URL was not found on the server.  If you entered the URL manually please check your spelling and try again."
  responseObject.status = "404"
  responseObject.title = "not found"
  res.status(404).send(responseObject)
})

app.listen(80, function () {
  console.log('App running on port 80!')
})
