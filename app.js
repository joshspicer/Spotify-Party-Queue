/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

//https://www.npmjs.com/package/node-spotify-api
var Spotify = require('node-spotify-api');

var client_id = '088e0745e49b44549f3521d2a209dd30'; // Your client id
var client_secret = 'a65682010e924c10909f0a14c22c07c6'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

var spotify = new Spotify({
  id: client_id,
  secret: client_secret
});


var the_token;
var the_refresh;
var targetToSearch;
var foundID;

// ----------------------------------------------------------------

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// ----------------------------------------------------------------

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cookieParser());

// ---------------------------------------------------------------

app.get('/saveInput', function(req, res){
       var myText = req.query.mytext; //input box
       targetToSearch = myText;
       res.redirect('/search'); //REDIRECT
   });

// ---------------------------------------------------------------

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'playlist-modify-private user-read-currently-playing user-read-playback-state user-read-private user-read-email user-read-playback-state playlist-modify-public';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
      show_dialog: true
    }));
});

//----------------------------------------------------------------------

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        // JOSH
        the_token = body.access_token;
        the_refresh = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});



//-----------------------------------------------------------

app.get('/addsong', function(req,res) {

  console.log("ADD SONG!!");

  //var song = 'spotify:track:0yTJtxZJ5VLfBEHhiNUNeY';

var song = {
 // url: 'https://api.spotify.com/v1/users/joshspicer37/playlists/5eZ2TL5zTxLq2O2cCLL5Ih' +
//  '/tracks?uris=' + foundID,
    url: 'https://api.spotify.com/v1/users/d9tq5qoypo7ltv0ueu21s6sfi/playlists/3A0yYPAlL8x1xubuKfzp69' +
     '/tracks?uris=' + foundID,
  headers: { 'Authorization': 'Bearer ' + the_token
            , 'Host': 'api.spotify.com',
              'Accept': 'application/json',
              'Content-Type': 'application/json' },
  json: true
};

  // use the access token to access the Spotify Web API
  request.post(song);

  res.redirect('/#access_token=' + the_token + '&refresh_token=' + the_refresh);

  console.log("add song DONE");

});

//---------------------------------------------------------

app.get('/search', function (req,res) {

  console.log("start search");

  // var searchQuery = document.getElementById("searchParam").value;
  //var searchQuery = "chasing cars";

  spotify
    .search({ type: 'track', query: targetToSearch,limit: 5})
    .then(function(response) {
      console.log(response['tracks']['items'][0]['album']['name']);
      console.log(response['tracks']['items'][0]['uri']);
      foundID = response['tracks']['items'][0]['uri'];
      res.redirect("/addsong"); //REDIRECT

    })
    .catch(function(err) {
      console.log(err);
      console.log("not found");
        res.redirect('/#access_token=' + the_token + '&refresh_token=' + the_refresh);

    });

  // var theRequest = {
  //   url: 'https://api.spotify.com/v1/search?q=silvertongue&type=track',
  //   headers: { 'Authorization': 'Bearer ' + the_token,
  //              'Host': 'api.spotify.com'},
  //   json: true
  // };

  // // use the access token to access the Spotify Web API
  // request.get(theRequest, function(error, response, body) {
  //   console.log("Sent Request");
  // }).then(function(response) {
  //   console.log(response);
  // });
  //
  // request.get(theRequest)
  // .on('response', function(response) {
  //   console.log(response.statusCode) // 200
  //   console.log("-----------------------")
  //   console.log(response)
  //   console.log("-----------------------")
  // }).then(function(response) {
  //
  // })


  console.log("End search");

});


// --------------------------------------------------------



app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

// ----------------------------------------------------------

console.log('Listening on 8888');
app.listen(8888);
