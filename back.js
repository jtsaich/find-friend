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
    var matched_users = [];
    for (var i = 0; i < schedule.length; i++) {
      getScheduleMatched(schedule[i], matched_users);
      res.write(JSON.stringify(matched_users));
    }
  for (var i = 0; i < schedule.length; i++) {
    updateSchedule(schedule, i); 
  }  
  });
  
  res.end();
  res.on('end', function(err) {
      console.log("server close...");
  });
}).listen(5000);

console.log("Connected to server...");
var getScheduleMatched = function(datetime, matched_users) {
  console.log("getScheduleMatched schedule:date->" + datetime.date);
  // get list of id
  redisClient.smembers("date:" + datetime.date, function(err, ret_datetime_id_list) {
    console.log("ret_datetime_id_list: " + ret_datetime_id_list.length);
    for (var x = 0; x < ret_datetime_id_list.length; x++) {
      // using datetime_id to get date_time object
      redisClient.hgetall("datetime:" + ret_datetime_id_list[x], function(err, ret_datetime) {
        // go through to find matching time slots
        for (var i = 0; i < ret_datetime.time_slot.length; i++) {
          for (var j = 0; j < datetime.time_slot.length; j++) {  
            if (ret_datetime.time_slot[i] == datetime.time_slot.time_slot[j]) {
              matched_users.push(datetime.user);
            }
          }
        }
      });
    }
  });
}

function updateSchedule(schedule, i) {
    if (redisClient.incr("global:nextDateTimeId")) {
      console.log("updateSchedule schedule:date->" + schedule[i].date);
      redisClient.get("global:nextDateTimeId", function(err, dateTimeId) {
        console.log("updateSchedule nextDateTimeId->" + dateTimeId);
        console.log("updateSchedule redis get schedule:date->" + i);
        redisClient.hset("datetime:" + dateTimeId, "date", schedule[i].date);
        redisClient.sadd("date:" + schedule[i].date, "datetime:" + dateTimeId, redisClient.print);
              for (var j = 0; j < schedule[i].time_slot.length; j++) {
                  updateScheduleTime(schedule, dateTimeId, i, j);
              }
      });

    };
}

function updateScheduleTime(schedule, dateTimeId, i, j) {
                  console.log("i:" + i);
                  console.log("redisClient:" + schedule[i].time_slot);
    if (redisClient.incr("global:nextTimeSlotId")) {
    redisClient.get("global:nextTimeSlotId", function(err, timeSlotId) {  
                  console.log("j:" + j);
        redisClient.hset("datetime:" + dateTimeId, "time_slot", timeSlotId);
        redisClient.sadd("time_slot:" + timeSlotId, 
          schedule[i].time_slot[j].time + ":" + 
          schedule[i].time_slot[j].activity, redisClient.print);
    });
    }
}
