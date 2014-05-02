var mongodb = require('mongodb').native();
var Db = mongodb.Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');

DZProvider = function(host, port) {
  this.db= new Db('node-mongo-dz', new Server(host, port, {auto_reconnect: true}), {w:1,journal:true,fsync:false});
  this.db.open(function(err,client){
    if(err) console.log("Error connecting to DB " + err);
    else console.log("DB Connection : OK");
  });
};

//getCollection

DZProvider.prototype.getCollection= function(collectionName, callback) {
  this.db.collection(collectionName, function(error, collection) {
    if( error ) callback(error);
    else callback(null, collection);
  });
};

DZProvider.prototype.findClosestDZ = function(longitude,latitude,callback) {
  var resultArray = [];
  var minDist = 3;
  var closestDZ = null;
    this.getCollection('dz', function(error, dz_collection) {
      if( error ) callback(error)
      else {
        dz_collection.find().toArray(function(error, results) {
          if( error ) callback(error)
          else 
            {  
              results.forEach( function(elem) { 
                var latRad1 = latitude*Math.PI/180;
                var longRad1 = longitude*Math.PI/180;

                var latRad2 = elem.latitude*Math.PI/180;
                var longRad2 = elem.longitude*Math.PI/180;

                var deltaLong = (elem.longitude - longitude)*Math.PI/180;
                var R = 6371;

                var d = Math.acos( Math.sin(latRad1)*Math.sin(latRad2) + Math.cos(latRad1)*Math.cos(latRad2) * Math.cos(deltaLong) ) * R;

                if( d < 2) {
                  resultArray.push(elem);
                }
              });
              callback(resultArray);
            }
          });
        }
    });
}

// Logging function
DZProvider.prototype.logInformation = function (ip, username, callback) {
  this.getCollection('logData', function(error, logCollection) {
    logCollection.insert({ip: ip, username: username,
         dateCreated : new Date()},function() {
           callback(null, null);
        })
  });
}

exports.DZProvider = DZProvider;

