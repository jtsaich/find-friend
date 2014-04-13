var http = require('http');
var options = {
    "Content-Type": 'application/json',
    hostname:'localhost', 
    port:'5000', 
    method:'POST'};
var request = http.request(options);
var schedule = [];
var monday = new Object();
var wednesday = new Object();
var time_slot_arr = [];

monday.date = 201140414;
time_slot_arr.push(new TimeSlot("early_morning", "bbq"));
time_slot_arr.push(new TimeSlot("late_morning", "bbq"));
time_slot_arr.push(new TimeSlot("night", "bbq"));
monday.time_slot = time_slot_arr;
wednesday.time_slot = time_slot_arr;

schedule.push(monday);
schedule.push(wednesday);

request.write(JSON.stringify(schedule));
request.end();

function TimeSlot(time, activity) {
  this.time = time;
  this.activity = activity;
  return this;
}
