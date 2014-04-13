var http = require('http');
var options = {
    "Content-Type": 'application/json',
    hostname:'localhost', 
    port:'5000', 
    method:'POST'};
var request = http.request(options);
request.write('{"schedule": [{"date":20140411, "time_slot":[' +
    '{"time":"early_morning", "activity":"hiking"},' +
    '{"time":"late_afternoon", "activity":"drinking"}' +
    ']}]}');
request.end();
