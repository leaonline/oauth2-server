# oauth2-server

This package is a implementation of the package [node-oauth2-server](https://github.com/thomseddon/node-oauth2-server) for Meteor.

It implements the `authorization_code` and works like the Facebook's OAuth popup.

## Install
```
meteor add leaonline:oauth2-server
```

## Implementation

### Server implementation



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
    refreshTokensCollectionName: 'oauth_refresh_tokens',
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

// Add a route to return account information
oauth2server.authenticatedRoute('/oauth/account', function (req, res, next) {
  var user = Meteor.users.findOne(req.user.id)

  res.send({
    id: user._id,
    name: user.name
  })
})

oauth2server.app.use('*', function (req, res, next) {
  res.writeHead(404)
  res.end('route not found')
})

```

### Client/Pupup implementation

You should install a router to handle client side routing indendently from the WebApp routes. You can for example use

```bash
$ meteor add ostrio:flow-router-extra
```

and then define a client route for your popup dialog:

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
