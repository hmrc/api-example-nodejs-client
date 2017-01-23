/*
 * Copyright 2017 HM Revenue & Customs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const clientId = 'CLIENT_ID_HERE';
const clientSecret = 'CLIENT_SECRET_HERE';
const serverToken = 'SERVER_TOKEN_HERE';

const simpleOauthModule = require('simple-oauth2');
const request = require('superagent');
const express = require('express');
const app = express();

const dateFormat = require('dateformat');
const winston = require('winston');

const log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: function() {
        return dateFormat(Date.now(), "isoDateTime");
      },
      formatter: function(options) {
        return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta) : '' );
      }
    })
  ]
});

const apiBaseUrl = 'https://api.service.hmrc.gov.uk';
const redirectUri = 'http://localhost:8080/oauth20/callback';

const cookieSession = require('cookie-session');

app.use(cookieSession({
  name: 'session',
  keys: ['oauth2Token', 'caller'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));


// OAuth2 module
const oauth2 = simpleOauthModule.create({
  client: {
    id: clientId,
    secret: clientSecret,
  },
  auth: {
    tokenHost: apiBaseUrl,
    tokenPath: '/oauth/token',
    authorizePath: '/oauth/authorize',
  },
});  

// Authorization uri definition
const authorizationUri = oauth2.authorizationCode.authorizeURL({
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'hello',
});

// Route definitions...

// home-page route
app.get('/', (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Say hello world is an example of an unrestricted endpoint
app.get("/hello-world",(req,res) => {
    callApi('/world', res);
});

// Say hello application is an example of an application-restricted endpoint 
app.get("/hello-application",(req,res) => {
  callApi('/application', res, serverToken);
});

// Say hello user is an example of a user-restricted endpoint
app.get("/hello-user",(req,res) => {
  if(req.session.oauth2Token){
    var accessToken = oauth2.accessToken.create(req.session.oauth2Token);

    if(accessToken.expired()){
        log.info('Token expired: ', accessToken.token);
        accessToken.refresh()
          .then((result) => {
            log.info('Refreshed token: ', result.token);
            req.session.oauth2Token = result.token;
            callApi('/user', res, result.token.access_token);
          })
          .catch(function (error) {
            log.error('Error refreshing token: ', error);
           });
    } else {
      log.info('Using token from session: ', accessToken.token);
      callApi('/user', res, accessToken.token.access_token);
    }
  } else {
    log.info('Need to request token')
    req.session.caller = '/hello-user';
    res.redirect(authorizationUri);
  }
});

// Callback service parsing the authorization token and asking for the access token
app.get('/oauth20/callback', (req, res) => {
  const options = {
    redirect_uri: redirectUri,
    code: req.query.code
  };

  oauth2.authorizationCode.getToken(options, (error, result) => {
    if (error) {
      log.error('Access Token Error: ', error);
      return res.json('Authentication failed');
    }

    log.info('Got token: ', result);
    // save token on session and return to calling page
    req.session.oauth2Token = result;
    res.redirect(req.session.caller);
  });
});


// Helper functions

function callApi(resource, res, bearerToken) {
  const req = request
    .get(apiBaseUrl + '/hello' + resource)
    .accept('application/vnd.hmrc.1.0+json');
  
  if(bearerToken) {
    log.info('Using bearer token:', bearerToken);
    req.set('Authorization', 'Bearer ' + bearerToken);
  }
  
  req.end((err, apiResponse) => handleResponse(res, err, apiResponse));
}

function handleResponse(res, err, apiResponse){
  if (err || !apiResponse.ok) {
    console.error(err);
    res.send(err);
  } else {
    res.send(apiResponse.body);
  }
};

function str(token){
  return `[A:${token.access_token} R:${token.refresh_token} X:${token.expires_at}]`;
}

app.listen(8080,() => {
  log.info('Started at http://localhost:8080');
});