var express = require("express");
var logfmt = require("logfmt");
var passport = require("passport");
var FacebookStrategy = require("passport-facebook").Strategy;

var app = express();


app.post('/login', passport.authenticate('local', { successRedirect: '/',
                                                    failureRedirect: '/login' }));

passport.use(new FacebookStrategy({
        clientID: "738322126201277",
        clientSecret: "50d28f4449d561f20fd00bfddbfc1c27",
        callbackURL: "http://localhost:5000/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        console.log(profile.toString());
        //User.findOrCreate({ username: profile.displayName}, function(err, user) {
        process.nextTick(function() {    
            //if (err) { return done(err); }
            return done(null, profile);
        });
    }
));

app.get("/auth/facebook/callback",
        passport.authenticate('facebook', { successRedirect: '/',
                                            failureRedirect: '/login' }));
app.get('/auth/facebook',
        passport.authenticate('facebook', { scope: 'read_stream' })
);

app.use(logfmt.requestLogger());

app.get('/', function(req, res) {
    res.send('Hello World!');
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
    console.log("Listening on " + port);
});
