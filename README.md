# Meteor OAuth2 Server

[![Test suite](https://github.com/leaonline/oauth2-server/actions/workflows/tests.yml/badge.svg)](https://github.com/leaonline/oauth2-server/actions/workflows/tests.yml)
[![CodeQL](https://github.com/leaonline/oauth2-server/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/leaonline/oauth2-server/actions/workflows/codeql-analysis.yml)
[![built with Meteor](https://img.shields.io/badge/Meteor-package-green?logo=meteor&logoColor=white)](https://atmospherejs.com/leaonline/oauth2-server)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
![GitHub](https://img.shields.io/github/license/leaonline/oauth2-server)

This package is a implementation of the package
[@node-oauth/oauth2-server](https://github.com/node-oauth/node-oauth2-server) 
for Meteor.
It can run without `express` (we use Meteor's builtin `WebApp`) and implements 
the `authorization_code` and `refresh_token` workflow and works like the Facebook's OAuth popup.

## Changelog

View the full changelog in the [history page](./HISTORY.md).

## Install

This package is a full scale drop-in, so you just need to add it via

```bash
$ meteor add leaonline:oauth2-server
```

## Implementation

The package comes with a default config, so you can start immediately.
However, we made it all configurable for you.

You can change various flags, routes and expiration times and collection names.
The following sections will show you how to setup the server with a full
configuration.

### Server implementation

The following example uses the full configuration.
The used values represent the current default values.

`server/oauth2server.js`
```javascript
import { Meteor } from "meteor/meteor"
import { OAuth2Server } from 'meteor/leaonline:oauth2-server'

const oauth2server = new OAuth2Server({
  serverOptions: {
    addAcceptedScopesHeader: true,
    addAuthorizedScopesHeader: true,
    allowBearerTokensInQueryString: false,
    allowEmptyState: false,
    authorizationCodeLifetime: 300,
    accessTokenLifetime: 3600,
    refreshTokenLifetime: 1209600,
    allowExtendedTokenAttributes: false,
    requireClientAuthentication: true
  },
  model: {
    accessTokensCollectionName: 'oauth_access_tokens',
    clientsCollectionName: 'oauth_clients',
    authCodesCollectionName: 'oauth_auth_codes',
    debug: true
  },
  routes: {
    accessTokenUrl: '/oauth/token',
    authorizeUrl: '/oauth/authorize',
    errorUrl: '/oauth/error',
    fallbackUrl: '/oauth/*'
  }
})

// this is a "secret" route that is only accessed with
// a valid token, which has been generated 
// by the authorization_code grant flow
// You will have to implement it to allow your remote apps
// to retrieve the user credentials after successful
// authentication.
oauth2server.authenticatedRoute().get('/oauth/ident', function (req, res, next) {
  const user = Meteor.users.findOne(req.data.user.id)

  res.writeHead(200, {
    'Content-Type': 'application/json',
  })
  const body = JSON.stringify({
    id: user._id,
    login: user.username,
    email: user.emails[0].address,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`
  })
  res.end(body)
})

// create some fallback for all undefined routes
oauth2server.app.use('*', function (req, res, next) {
  res.writeHead(404)
  res.end('route not found')
})
```

### Additional validation

Often, you want to restrict who of your users can access which client / service.
In order to decide to give permission or not, you can register a handler that
receives the authenticated user and the client she aims to access:

```javascript
oauth2server.validateUser(function({ user, client }) {
  // the following example uses alanning:roles to check, whether a user
  // has been assigned a role that indicates she can access the client.
  // It is up to you how you implement this logic. If all users can access
  // all registered clients, you can simply omit this call at all.
  const { clientId } = client
  const { _id } = user
  
  return Roles.userIsInRoles(_id, 'manage-app', clientId)
})
```



### Client/Popup implementation

You should install a router to handle client side routing independently 
from the WebApp routes. You can for example use:

```bash
$ meteor add ostrio:flow-router-extra
```

and then define a client route for your popup dialog (we use Blaze in this example
but it will work with any of your preferred and loved frontends):

`client/main.html`
```javascript
<head>
    <title>authserver</title>
</head>

<template name="layout">
    {{> yield}}
</template>
```

`client/main.js`
```javascript
import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import './authorize.html'
import './authorize'
import './main.html'

// Define the route to render the popup view
FlowRouter.route('/dialog/oauth', {
  action: function (params, queryParams) {
    this.render('layout', 'authorize', queryParams)
  }
})
```

`client/authorize.js`
```javascript
// Subscribe the list of already authorized clients
// to auto accept
Template.authorize.onCreated(function() {
  this.subscribe('authorizedOAuth');
});

// Get the login token to pass to oauth
// This is the best way to identify the logged user
Template.authorize.helpers({
  getToken: function() {
    return localStorage.getItem('Meteor.loginToken');
  }
});

// Auto click the submit/accept button if user already
// accepted this client
Template.authorize.onRendered(function() {
  var data = this.data;
  this.autorun(function(c) {
    var user = Meteor.user();
    if (user && user.oauth && user.oauth.authorizedClients && user.oauth.authorizedClients.indexOf(data.client_id()) > -1) {
      c.stop();
      $('button').click();
    }
  });
});
```

`client/authorize.html`
```html
<template name="authorize">
  {{#if currentUser}}
    <form method="post" action="{{redirect_uri}}" role="form" class="{{#unless Template.subscriptionsReady}}hidden{{/unless}}">
      <h2>Authorise</h2>
      <input type="hidden" name="allow" value="yes">
      <input type="hidden" name="token" value="{{getToken}}">
      <input type="hidden" name="client_id" value="{{client_id}}">
      <input type="hidden" name="redirect_uri" value="{{redirect_uri}}">
      <input type="hidden" name="response_type" value="code">
      <button type="submit">Authorise</button>
    </form>
    {{#unless Template.subscriptionsReady}}
      loading...
    {{/unless}}
  {{else}}
    {{> loginButtons}}
  {{/if}}
</template>
```

`client/style.css`
```css
.hidden {
  display: none;
}
```

## API and Documentation

We also have an [API documentation](./API.md) with further info on the 
package internals.

Furthermore we suggest you to consult the RFC docs on OAuth2:

- [RFC 6749 -  The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749.html)
- [RFC 6750 - The OAuth 2.0 Authorization Framework: Bearer Token Usage](https://datatracker.ietf.org/doc/html/rfc6750.html)

## Testing

We use mocha with `meteortesting:mocha` to run the tests. 
We have now a full scale test project inside this one and you can use it 
extensively to lint and test this project.

### Setup

The setup is already prepared, so you just need to run a few commands:

```bash
$ cd test-proxy
$ meteor npm install # install npm dependencies
$ meteor npm run setup # link with package
```

### Run the linter

After the setup from the previous section you can run the linter via

```bash
$ meteor npm run lint
```

or auto-fix code via

```bash
$ meteor npm run lint:fix
```

Note, that we use `standardx`, which is `standard` code style with a few extra
tweaks. We also use `eslint-plugin-security`, which can sometimes create lots
of false-positives. If you need assistance, feel free to create an issue.

### Run the tests

After the setup from the previous section you can run the tests via

```bash
$ meteor npm run test
```

or in watch mode via

```bash
$ meteor npm run test:watch
```

or with coverage report (+ watch mode) via

```bash
$ meteor npm run test:coverage
```

### Build the docs

We use jsDoc and jsdoc2md to create a markdown file. To build the docs use

```bash
$ meteor npm run build:docs
```

## License

MIT, see [license file](./LICENSE)
