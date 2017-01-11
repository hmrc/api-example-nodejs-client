api-example-nodejs-client
=========================

*api-example-nodejs-client* is a sample Node.js application that provides a reference implementation of a HMRC client application.

It accesses three endpoints, each with their own authorisation requirements:

* Hello World - an Open endpoint that responds with the message “Hello World!”
* Hello Application - an Application-restricted endpoint that responds with the message “Hello Application!”
* Hello User - a User-restricted endpoint (accessed using an OAuth 2.0 token) that responds with the message “Hello User!”

The implementation of the Hello User flow requests an OAuth 2.0 token and subsequently uses that token to access the dummy secured endpoint.

The parameters clientId, clientSecret and serverToken will need to be updated in [`app.js`](app.js)

API documentation is available at https://developer.service.hmrc.gov.uk/api-documentation

Application developers need to register with the platform and will be provided with key, secret and tokens upon registration.

The node dependancies can be installed locally by running:
```
npm install
```

The server can be started with the following command:
```
npm start
```

Once running, the application will be available at:

```
http://localhost:8080/
```

### License

This code is open source software licensed under the [Apache 2.0 License]("http://www.apache.org/licenses/LICENSE-2.0.html").
