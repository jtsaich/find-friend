var http = require('http')  
  , express = require('express')
  , redis = require('redis')
  , passport = require('passport')
  , util = require('util')
  , FacebookStrategy = require('passport-facebook').Strategy;

var redisClient;

if (process.env.REDISTOGO_URL) {
    var rtg   = require("url").parse(process.env.REDISTOGO_URL);
    redisClient = redis.createClient(rtg.port, rtg.hostname);
    redisClient.auth(rtg.auth.split(":")[1]);
} else {
    redisClient = redis.createClient();
  
}

var FACEBOOK_APP_ID = "738322126201277"
var FACEBOOK_APP_SECRET = "50d28f4449d561f20fd00bfddbfc1c27";


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Facebook profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the FacebookStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Facebook
//   profile), and invoke a callback with a user object.
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log("username: " + profile.username);
    console.log("id: " + profile.id);
    console.log("displayName: " + profile.displayName);
    redisClient.get("facebook_id:" + profile.id + ":user", function(err, reply) {
      // acount does not exist
      if (reply == null) {
        if (redisClient.incr("global:nextUserId")) {
          redisClient.get("global:nextUserId", function(err, uid) {
            redisClient.hmset("user:" + uid, {
              "username": profile.username, 
              "facebook_id": profile.id, 
              "name": profile.displayName, 
            });
            redisClient.set("username:" + profile.username + ":user", uid);
            redisClient.set("facebook_id:" + profile.id + ":user", uid);
            redisClient.hgetall("user:" + uid, function (err, obj) {
              console.log("user:" + uid + "->" + obj);
            });

          });
        }
              }
    });
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Facebook profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Facebook account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));




var app = express();

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.engine('.html', require('ejs').renderFile);
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});



app.get('/', function(req, res){
  res.render('DateSelection');
});

app.post('/find', function(req, res) {
  req.on('data', function(data) {
    var schedule = JSON.parse(data);
    var matched_users = [];
    for(var i = 0; i < schedule.length; i++) {
        getScheduleMatched(schedule[i], matched_users)();
        res.render('match', {json: JSON.stringify(matched_users)});
    }
    for(var i = 0; i < schedule.length; i++) {
        updateSchedule(schedule, i);
    }
  });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

// GET /auth/facebook
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Facebook authentication will involve
//   redirecting the user to facebook.com.  After authorization, Facebook will
//   redirect the user back to this application at /auth/facebook/callback
app.get('/auth/facebook',
  passport.authenticate('facebook'),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
  });

// GET /auth/facebook/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

var port = Number(process.env.PORT || 3000);
app.listen(port, function() {
    console.log("Listening on " + port);
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}


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
