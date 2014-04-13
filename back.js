var http = require('http');
var redis = require('redis');
var redisClient = redis.createClient();

redisClient.on("error", function(err) {
  console.log("Error " + err);
});


http.createServer(function(req, res) {
  res.writeHead(200, {"Content-Type": "text/plain"});
  req.on('data', function(data) {
    var schedule = JSON.parse(data);
    for (var i = 0; i < schedule.length; i++) {
      console.log(schedule[i].date);
      for (var j = 0; j < schedule[i].time_slot.length; j++) {
        console.log(schedule[i].time_slot[j].activity);
        console.log(schedule[i].time_slot[j].time);
      }
    } 
  });
  
}).listen(5000);

console.log("Connected to server...");

function createSchedule(user, schedule) {
  user.schedule = schedule;
}

// read request data for schedule creation
// redisClient.set
