api-example-nodejs-client
=========================

*api-example-nodejs-client* is a sample Node.js application that provides a reference implementation of a HMRC client application.

It accesses three endpoints, each with their own authorisation requirements:

* Hello World - an Open endpoint that responds with the message “Hello World!”
* Hello Application - an Application-restricted endpoint that responds with the message “Hello Application!”
* Hello User - a User-restricted endpoint (accessed using an OAuth 2.0 token) that responds with the message “Hello User!”

The implementation of the Hello User flow requests an OAuth 2.0 token and subsequently uses that token to access the dummy secured endpoint.

API documentation is available on the [HMRC Developer Hub](https://developer.service.hmrc.gov.uk/api-documentation).

## Setup
1. [Register for a developer account](https://developer.service.hmrc.gov.uk/developer/registration) on the HMRC Developer Hub 
1. Create a new application on the Developer Hub, and when prompted to subscribe to some APIs select the **Hello World** API only
1. Once the application has been created you will be given a Client ID and prompted to generate a Client Secret - take note of both these values
1. Select your application from the [View all applications page](https://developer.service.hmrc.gov.uk/developer/applications)
1. Select the **Redirect URIs** link and then click **Add a redirect URL**
1. Enter the URI value `http://localhost:8080/oauth20/callback`
1. Within your local copy of this project, edit the [app.js](app.js) file, updating the `clientId` and `clientSecret` variables with the values noted previously


The node dependencies can be installed locally by running:
```
npm install
```

The server can be started with the following command:
```
npm start
```

Once running, the application will be [available here](http://localhost:8080/).


### License

This code is open source software licensed under the [Apache 2.0 License]("http://www.apache.org/licenses/LICENSE-2.0.html").
