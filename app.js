var express = require('express');
var connect = require('connect');
var stylus = require('stylus');
var fs = require('fs');
var util = require('util');
var MemoryStore = express.session.MemoryStore;
var https = require('https');
var DZProvider = require('./DZProvider-mongodb').DZProvider;
var crypto = require('crypto');
var apns = require("apns"), options, connection, notification;

var options = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.crt')
};

var app = module.exports = express();
https.createServer(options, app).listen(443);

var sessionTimeOut = 3600000; //1 hour

var server = connect();

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(express.limit('400mb'));
  app.use(express.cookieParser());
  app.use(express.session({cookie: { maxAge : sessionTimeOut },  store: new MemoryStore(), secret:'my secret'}));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use('/images/', express.static(__dirname + "/images/"));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

var DZProvider = new DZProvider('localhost', 27017);
var type = Function.prototype.call.bind( Object.prototype.toString );

app.set('view options', { layout: true });
app.set('view options', { pretty: true });
app.locals.pretty = true; 

app.get('/api/findClosestDZ', function(req,res) { // call : http://localhost:3000/api/findClosestDZ?latitude=48.78646&longitude=2.17189&distance=2000
  latitude = req.query["latitude"];
  longitude = req.query["longitude"];
  distance = req.query["distance"];

  var ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;

  var now = new Date();

  console.log(now + " - Received request from " + ip + " for longitude = " + longitude + " latitude = " + latitude + " distance = " + distance);
  
  console.time("findClosestDZ");
  DZProvider.findClosestDZ( longitude, latitude, distance, function (result) {
    res.send(result);
	});
  console.timeEnd("findClosestDZ");

});

app.get('/', function(req, res){ // http://localhost:3000/api/go?page=1&montantMin=1&montantMax=3
  DZProvider.getDevicesAndDZ(function(devices,dzs){
        res.render('home', {
            title: 'DZ Web Site',
            devices:devices,
            dzs:dzs,
            countdz:dzs.length
        });
    }); 
});

app.post('/sendNotif' ,function(req, res){
  DZProvider.sendAPN( function (result) {
    res.send(result + " notifications sent");
  });
});

app.post('/upload' ,function(req, res){
    if(req.files.fileNames.name != '') {
      if( Array.isArray(req.files.fileNames) ) {
        req.files.fileNames.forEach( function(elem) {  
        DZProvider.uploadDocument(elem, function() {
          });
        });
      }
      else {
        DZProvider.uploadDocument(req.files.fileNames, function() {
          });
      }
      res.redirect('/');
    }
    else
    {
      console.log( 'no files');
      res.redirect('/');
    }
}); 

app.get('/api/findAllDZ', function(req,res) { // call : http://localhost:3000/api/findClosestDZ?latitude=48.78646&longitude=2.17189&distance=2000
  var ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
  
  var now = new Date();
  console.log(now + " - Received request from " + ip + " for all DZ");

  console.time("findAllDZ");
  DZProvider.findAllDZ( function (result) {
    res.send(result);
  });
  console.timeEnd("findAllDZ");
});

app.get('/api/addDevice', function(req,res) {
  DZProvider.addDevice( req.param('deviceid'), function(result) {
      res.send(result);
  });
});

app.get('/api/notifNewDZ', function(req,res) {  
  DZProvider.sendAPN( function (result) {
    res.send(result + " notifications sent");
  });
});

app.get('/api/checkVersion', function(req,res) {  
  DZProvider.checkVersion( function (result) {
    res.send(result);
  });
});


app.listen(3000);


