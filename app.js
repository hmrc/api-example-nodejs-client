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

//const clientId = 'CLIENT_ID_HERE';
//const clientSecret = 'CLIENT_SECRET_HERE';
//const serverToken = 'SERVER_TOKEN_HERE';

const clientId = 'VrsFzEO9GsiffqZloyFucBVebBYa';
const clientSecret = 'a09effc0-a6b4-40f4-8025-97bda87068d9';
const serverToken = '4a6a7cc531aa5f2f5bd02aba873cfe1';


const simpleOauthModule = require('simple-oauth2');
const request = require('superagent');
const express = require('express');
const app = express();

const apiBaseUrl = 'https://api.service.hmrc.gov.uk';
const redirectUrl = 'http://localhost:8080/oauth20/callback';

const cookieSession = require('cookie-session');

app.use(cookieSession({
  name: 'session',
  keys: ['accessToken', 'caller'],
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
  redirect_uri: redirectUrl,
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
  if(req.session.accessToken){
    callApi('/user', res, req.session.accessToken);
  } else {
    req.session.caller = '/hello-user';
    res.redirect(authorizationUri);
  }
});

// Callback service parsing the authorization token and asking for the access token
app.get('/oauth20/callback', (req, res) => {
  const code = req.query.code;
  const options = {
    redirect_uri: redirectUrl,
    code,
  };

  oauth2.authorizationCode.getToken(options, (error, result) => {
    if (error) {
      console.error('Access Token Error', error);
      return res.json('Authentication failed');
    }
    
    // save token on session and return to calling page
    req.session.accessToken = result.access_token;   
    res.redirect(req.session.caller);
  });
});


// Helper functions

function callApi(resource, res, bearerToken) {
  const req = request
    .get(apiBaseUrl + '/hello' + resource)
    .accept('application/vnd.hmrc.1.0+json');
  
  if(bearerToken) {
    req.set('Authorization', 'Bearer ' + bearerToken);
  }
  
  req.end((err, res2) => handleResponse(res, err, res2));    
}

function handleResponse(res, err, res2){
  if (err || !res2.ok) {
    console.error(err);
    res.send(err);
  } else {
    res.send(JSON.stringify(res2.body));
  }
};

app.listen(8080,() => {
  console.log("Started at http://localhost:8080");
});