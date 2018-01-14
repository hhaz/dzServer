var mongodb = require('mongodb').native();
var Db = mongodb.Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');
var apns = require("apns"), options, connection, notification;
var csv = require('csv');

DZProvider = function(host, port) {
  this.db= new Db('node-mongo-dz', new Server(host, port, {auto_reconnect: true}), {w:1,journal:true,fsync:false});
  this.db.open(function(err,client){
    if(err) console.log("Error connecting to DB " + err);
    else console.log("DB Connection : OK");
  });
};

DZProvider.prototype.uploadDocument = function(file,callback){
 this.getCollection('dz', function(error, dz_collection) {
      if( error ) callback(error)
      else {
        dz_collection.remove(function(err,result) {});
        csv().from.path(file.path , { delimiter: ',', escape: '"' }).transform( function(row,index){
        dz_collection.insert({longitude: row[0], latitude: row[1], description: row[2]}, function() {
           callback(null, null);
        });
        })
      }
  });
};

DZProvider.prototype.sendAPN = function(callback) {
  
  var count=0;
  
  options = {
     keyFile : "APNS/iDZKey.pem",
     certFile : "APNS/iDZCert.pem",
     gateway : "gateway.sandbox.push.apple.com",
     passphrase : "taido",
     debug : true
  };

  connection = new apns.Connection(options);
  this.getCollection('devices', function(error, dz_collection) {
    if( error ) callback(error)
      else {
        dz_collection.find().toArray(function(error, results) {
          if( error ) callback(error)
          else 
            {
                results.forEach( function(elem) { 
                  count++; 
                  notification = new apns.Notification();
                  notification.device = new apns.Device(elem.deviceID);
                  notification.alert = {"loc-key" : "NEW_DATA"};
                  connection.sendNotification(notification);
                });
                callback(count);
            }
          });
      }
    });
};

DZProvider.prototype.addDevice = function( deviceID, callback) {
  this.getCollection('devices', function(error, dz_collection) {
    if( error ) callback(error)
      else {
        dz_collection.findOne({deviceID: deviceID}, function(error, result) {
          if( error ) callback(error)
          else 
            {
              var now = new Date();
              if(result == null) {
                  dz_collection.insert({deviceID: deviceID,lastDate: now},function() {
                  callback("Device " + deviceID + " added");
                });
              }
              else {
                console.log(result._id);
                dz_collection.update({deviceID: deviceID}, {"$set": {lastDate: now}}, function(error, result2) {
                if( error )  {
                  callback(error); 
                }
                 else {
                  callback("Device already exists");
                }
             });
              };
            }
          });
      }
    });
};

DZProvider.prototype.getDevices = function(callback) {
  this.getCollection('devices', function(error, dz_collection) {
      if( error ) callback(error)
      else {
        dz_collection.find().toArray(function(error, results) {
          if( error ) {
            callback(error); 
          }
            else {
              results.forEach(function(elem)
              {
                elem.lastDate = elem.lastDate.toISOString().replace(/T/, ' ').replace(/\..+/, '');
              });
              callback(results);
            }
        });
      }
    });
}

DZProvider.prototype.getDZ = function(callback) {
  this.getCollection('dz', function(error, dz_collection) {
      if( error ) callback(error)
      else {
        dz_collection.find().toArray(function(error, results) {
          if( error ) {
            callback(error); 
          }
            else {
              callback(results);
            }
        });
      }
    });
}

DZProvider.prototype.getDevicesAndDZ = function(callback) {
localObject = this;
  this.getDevices(function(devices) {
    localObject.getDZ(function(dzs) {
      callback(devices,dzs);
    });
  }
);
}

//getCollection

DZProvider.prototype.getCollection= function(collectionName, callback) {
  this.db.collection(collectionName, function(error, collection) {
    if( error ) callback(error);
    else callback(null, collection);
  });
};

DZProvider.prototype.checkVersion = function(callback) {
    this.getCollection('dzVersion', function(error, dz_version) {
      if( error ) callback(error)
      else {
        dz_version.find().toArray(function(error, results) {
          if( error ) callback(error) 
            else
              callback(results);
        });
      }
    }
)}

DZProvider.prototype.findAllDZ = function(callback) {
    this.getCollection('dz', function(error, dz_collection) {
      if( error ) callback(error)
      else {
        dz_collection.find().toArray(function(error, results) {
          if( error ) callback(error) 
            else
              callback(results);
        });
      }
    }
)}

DZProvider.prototype.findClosestDZ = function(longitude,latitude,distance, callback) {
  var resultArray = [];

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

                if( d < distance/1000) { //distance is provided in meter and d is in km
                  /*var y = Math.sin(longRad2-longRad1) * Math.cos(latRad2);
                  var x = Math.cos(latRad1)*Math.sin(latRad2) - Math.sin(latRad1)*Math.cos(latRad2)*Math.cos(longRad2-longRad1);
                  var brng = Math.atan2(y, x)*180/Math.PI;

                  console.log( "bearing : " + brng);*/

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

