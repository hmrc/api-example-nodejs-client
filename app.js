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

// Start Client configuration
const clientId = 'CLIENT_ID_HERE';
const clientSecret = 'CLIENT_SECRET_HERE';

const useSandbox = true;
const apiBaseUrlSandbox = 'https://test-api.service.hmrc.gov.uk/';
const apiBaseUrlProduction = 'https://api.service.hmrc.gov.uk/';
const apiBaseUrl = useSandbox ? apiBaseUrlSandbox : apiBaseUrlProduction;
const serviceName = 'hello'

const serviceVersion = '1.0'

const unRestrictedEndpoint = '/world';
const appRestrictedEndpoint = '/application';
const userRestrictedEndpoint = '/user';

const oauthScope = 'hello';

const { AuthorizationCode, ClientCredentials } = require('simple-oauth2');
const request = require('superagent');
const express = require('express');
const app = express();

app.set('view engine', 'ejs');

const dateFormat = require('dateformat');
const winston = require('winston');

const log = winston.createLogger({
  transports: [
    new (winston.transports.Console)({
      timestamp: () => dateFormat(Date.now(), "isoDateTime"),
      formatter: (options) => `${options.timestamp()} ${options.level.toUpperCase()} ${options.message ? options.message : ''}
          ${options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta) : ''}`
    })
  ]
});

const redirectUri = 'http://localhost:8080/oauth20/callback';

const cookieSession = require('cookie-session');

app.use(cookieSession({
  name: 'session',
  keys: ['oauth2Token', 'caller'],
  maxAge: 10 * 60 * 60 * 1000 // 10 hours
}));

const oauthConfig = {
  client: {
    id: clientId,
    secret: clientSecret,
  },
  auth: {
    tokenHost: apiBaseUrl,
    tokenPath: '/oauth/token',
    authorizePath: '/oauth/authorize',
  },
};

const client = new AuthorizationCode(oauthConfig);

const authorizationUri = client.authorizeURL({
  redirect_uri: redirectUri,
  scope: oauthScope,
});

// home-page route
app.get('/', (req, res) => {
  res.render('index', {
    service: `${serviceName} (v${serviceVersion})`,
    unRestrictedEndpoint: unRestrictedEndpoint,
    appRestrictedEndpoint: appRestrictedEndpoint,
    userRestrictedEndpoint: userRestrictedEndpoint
  });
});

// Call an unrestricted endpoint
app.get("/unrestrictedCall", (req, res) => {
  callApi(unRestrictedEndpoint, res);
});

// Call an application-restricted endpoint
app.get("/applicationCall", async (req, res) => {
  const config = {
    ...oauthConfig,
    options: {
      authorizationMethod: 'body'
    }
  };

  const clientCredentials = new ClientCredentials(config);
  try {
    const accessTokenDetails = await clientCredentials.getToken({'scope': oauthScope});
    const accessToken = accessTokenDetails.token.access_token;

    callApi(appRestrictedEndpoint, res, accessToken);

  } catch (error) {
    return res.status(500).json('Authentication failed');
  }
});

// Call a user-restricted endpoint
app.get("/userCall", (req, res) => {
  if (req.session.oauth2Token) {
    var accessToken = client.createToken(req.session.oauth2Token);

    log.info(`Using token from session: ${JSON.stringify(accessToken.token)}`);

    callApi(userRestrictedEndpoint, res, accessToken.token.access_token);
  } else {
    req.session.caller = '/userCall';
    res.redirect(authorizationUri);
  }
});

// Callback service parsing the authorization token and asking for the access token
app.get('/oauth20/callback', async (req, res) => {
  const { code } = req.query;
  const options = {
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  };

  try {
    const accessToken = await client.getToken(options);

    req.session.oauth2Token = accessToken;

    return res.redirect(req.session.caller);
  } catch(error) {
    return res.status(500).json('Authentication failed');
  }
});

// Helper functions
function callApi(resource, res, bearerToken) {
  const acceptHeader = `application/vnd.hmrc.${serviceVersion}+json`;
  const url = apiBaseUrl + serviceName + resource;
  
  log.info(`Calling ${url} with Accept: ${acceptHeader}`);

  const req = request
    .get(url)
    .accept(acceptHeader);

  if (bearerToken) {
    log.info(`Using bearer token: ${bearerToken}`);
    req.set('Authorization', `Bearer ${bearerToken}`);
  }

  req.end((err, apiResponse) => handleResponse(res, err, apiResponse));
}

function handleResponse(res, err, apiResponse) {
  if (err || !apiResponse.ok) {
    log.error(`Handling error response: ${err}`);
    res.send(err);
  } else {
    res.send(apiResponse.body);
  }
};

app.listen(8080, () => {
  log.info('Started at http://localhost:8080');
});