## Classes

<dl>
<dt><a href="#OAuthMeteorModel">OAuthMeteorModel</a></dt>
<dd><p>Implements the OAuth2Server model with Meteor-Mongo bindings.</p>
</dd>
<dt><a href="#OAuth2Server">OAuth2Server</a></dt>
<dd><p>The base class of this package.
Represents an oauth2-server with a default model setup for Meteor/Mongo.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#OAuth2ServerDefaults">OAuth2ServerDefaults</a> : <code>Object</code></dt>
<dd><p>Default options, that are used to merge with the user
defined options.</p>
</dd>
<dt><a href="#DefaultModelConfig">DefaultModelConfig</a> : <code>Object</code></dt>
<dd><p>Default collection names for the model collections.</p>
</dd>
<dt><a href="#bind">bind</a> ⇒ <code>function</code></dt>
<dd><p>Binds a function to the Meteor environment and Fiber</p>
</dd>
<dt><a href="#createCollection">createCollection</a> ⇒ <code>Mongo.Collection</code></dt>
<dd><p>If the given collection is already created or cached, returns the collection
or creates a new one.</p>
</dd>
<dt><a href="#errorHandler">errorHandler</a></dt>
<dd><p>Unifies error handling as http response.
Defaults to a 500 response, unless further details were added.</p>
</dd>
<dt><a href="#isModelInterface">isModelInterface</a> ⇒ <code>boolean</code></dt>
<dd><p>Since we allow projects to implement their own model (while providing ours
as drop-in) we still need to validate, whether they implement the model
correctly.</p>
<p>We duck-type check if the model implements the most important functions.
Uses the following values to check:</p>
<ul>
<li>&#39;getAuthorizationCode&#39;,</li>
<li>&#39;getClient&#39;,</li>
<li>&#39;getRefreshToken&#39;,</li>
<li>&#39;revokeAuthorizationCode&#39;,</li>
<li>&#39;saveAuthorizationCode&#39;,</li>
<li>&#39;saveRefreshToken&#39;,</li>
<li>&#39;saveToken&#39;,</li>
<li>&#39;getAccessToken&#39;</li>
</ul>
</dd>
<dt><a href="#UserValidation">UserValidation</a></dt>
<dd><p>Used to register handlers for different instances that validate users.
This allows you to validate user access on a client-based level.</p>
</dd>
<dt><a href="#app">app</a> : <code>Object</code></dt>
<dd><p>Wrapped <code>WebApp</code> with express-style get/post and default use routes.</p>
</dd>
</dl>

<a name="OAuthMeteorModel"></a>

## OAuthMeteorModel
Implements the OAuth2Server model with Meteor-Mongo bindings.

**Kind**: global class  

* [OAuthMeteorModel](#OAuthMeteorModel)
    * [.log(...args)](#OAuthMeteorModel+log)
    * [.getAccessToken()](#OAuthMeteorModel+getAccessToken)
    * [.createClient(title, homepage, description, privacyLink, redirectUris, grants, clientId, secret)](#OAuthMeteorModel+createClient) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.getClient()](#OAuthMeteorModel+getClient)
    * [.saveToken()](#OAuthMeteorModel+saveToken)
    * [.getAuthorizationCode()](#OAuthMeteorModel+getAuthorizationCode) ⇒
    * [.saveAuthorizationCode(code, client, user)](#OAuthMeteorModel+saveAuthorizationCode) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.revokeAuthorizationCode()](#OAuthMeteorModel+revokeAuthorizationCode)
    * [.saveRefreshToken(token, clientId, expires, user)](#OAuthMeteorModel+saveRefreshToken) ⇒ <code>Promise.&lt;\*&gt;</code>
    * [.getRefreshToken()](#OAuthMeteorModel+getRefreshToken)
    * [.grantTypeAllowed(clientId, grantType)](#OAuthMeteorModel+grantTypeAllowed) ⇒ <code>boolean</code>

<a name="OAuthMeteorModel+log"></a>

### oAuthMeteorModel.log(...args)
Logs to console if debug is set to true

**Kind**: instance method of [<code>OAuthMeteorModel</code>](#OAuthMeteorModel)  

| Param | Description |
| --- | --- |
| ...args | arbitrary list of params |

<a name="OAuthMeteorModel+getAccessToken"></a>

### oAuthMeteorModel.getAccessToken()
getAccessToken(token) should return an object with:
   accessToken (String)
   accessTokenExpiresAt (Date)
   client (Object), containing at least an id property that matches the supplied client
   scope (optional String)
   user (Object)

**Kind**: instance method of [<code>OAuthMeteorModel</code>](#OAuthMeteorModel)  
<a name="OAuthMeteorModel+createClient"></a>

### oAuthMeteorModel.createClient(title, homepage, description, privacyLink, redirectUris, grants, clientId, secret) ⇒ <code>Promise.&lt;Object&gt;</code>
Registers a new client app in the {Clients} collection

**Kind**: instance method of [<code>OAuthMeteorModel</code>](#OAuthMeteorModel)  

| Param |
| --- |
| title | 
| homepage | 
| description | 
| privacyLink | 
| redirectUris | 
| grants | 
| clientId | 
| secret | 

<a name="OAuthMeteorModel+getClient"></a>

### oAuthMeteorModel.getClient()
getClient(clientId, clientSecret) should return an object with, at minimum:
   redirectUris (Array)
   grants (Array)

**Kind**: instance method of [<code>OAuthMeteorModel</code>](#OAuthMeteorModel)  
<a name="OAuthMeteorModel+saveToken"></a>

### oAuthMeteorModel.saveToken()
saveToken(token, client, user) and should return:
   accessToken (String)
   accessTokenExpiresAt (Date)
   client (Object)
   refreshToken (optional String)
   refreshTokenExpiresAt (optional Date)
   user (Object)

**Kind**: instance method of [<code>OAuthMeteorModel</code>](#OAuthMeteorModel)  
<a name="OAuthMeteorModel+getAuthorizationCode"></a>

### oAuthMeteorModel.getAuthorizationCode() ⇒
getAuthCode() was renamed to getAuthorizationCode(code) and should return:
   client (Object), containing at least an id property that matches the supplied client
   expiresAt (Date)
   redirectUri (optional String)

**Kind**: instance method of [<code>OAuthMeteorModel</code>](#OAuthMeteorModel)  
**Returns**: An Object representing the authorization code and associated data.  
<a name="OAuthMeteorModel+saveAuthorizationCode"></a>

### oAuthMeteorModel.saveAuthorizationCode(code, client, user) ⇒ <code>Promise.&lt;Object&gt;</code>
should return an Object representing the authorization code and associated data.

**Kind**: instance method of [<code>OAuthMeteorModel</code>](#OAuthMeteorModel)  

| Param |
| --- |
| code | 
| client | 
| user | 

<a name="OAuthMeteorModel+revokeAuthorizationCode"></a>

### oAuthMeteorModel.revokeAuthorizationCode()
revokeAuthorizationCode(code) is required and should return true

**Kind**: instance method of [<code>OAuthMeteorModel</code>](#OAuthMeteorModel)  
<a name="OAuthMeteorModel+saveRefreshToken"></a>

### oAuthMeteorModel.saveRefreshToken(token, clientId, expires, user) ⇒ <code>Promise.&lt;\*&gt;</code>
**Kind**: instance method of [<code>OAuthMeteorModel</code>](#OAuthMeteorModel)  

| Param |
| --- |
| token | 
| clientId | 
| expires | 
| user | 

<a name="OAuthMeteorModel+getRefreshToken"></a>

### oAuthMeteorModel.getRefreshToken()
getRefreshToken(token) should return an object with:
   refreshToken (String)
   client (Object), containing at least an id property that matches the supplied client
   refreshTokenExpiresAt (optional Date)
   scope (optional String)
   user (Object)

**Kind**: instance method of [<code>OAuthMeteorModel</code>](#OAuthMeteorModel)  
<a name="OAuthMeteorModel+grantTypeAllowed"></a>

### oAuthMeteorModel.grantTypeAllowed(clientId, grantType) ⇒ <code>boolean</code>
**Kind**: instance method of [<code>OAuthMeteorModel</code>](#OAuthMeteorModel)  

| Param |
| --- |
| clientId | 
| grantType | 

<a name="OAuth2ServerDefaults"></a>

## OAuth2ServerDefaults : <code>Object</code>
Default options, that are used to merge with the user
defined options.

**Kind**: global constant  
<a name="DefaultModelConfig"></a>

## DefaultModelConfig : <code>Object</code>
Default collection names for the model collections.

**Kind**: global constant  
<a name="bind"></a>

## bind ⇒ <code>function</code>
Binds a function to the Meteor environment and Fiber

**Kind**: global constant  
**Returns**: <code>function</code> - the bound function  

| Param | Type |
| --- | --- |
| fn | <code>function</code> | 

<a name="createCollection"></a>

## createCollection ⇒ <code>Mongo.Collection</code>
If the given collection is already created or cached, returns the collection
or creates a new one.

**Kind**: global constant  

| Param | Type |
| --- | --- |
| passedCollection | <code>Mongo.Collection</code> \| <code>undefined</code> | 
| collectionName | <code>string</code> | 

<a name="errorHandler"></a>

## errorHandler
Unifies error handling as http response.
Defaults to a 500 response, unless further details were added.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| res |  |  |
| options | <code>Object</code> | options with error information |
| options.error | <code>String</code> | Error name |
| options.description | <code>String</code> | Error description |
| options.uri | <code>String</code> | Optional uri to redirect to when error occurs |
| options.status | <code>Number</code> | Optional statuscode, defaults to 500 |
| options.state | <code>String</code> | State object vor validation |
| options.debug | <code>Boolean</code> \| <code>undefined</code> | State object vor validation |
| options.originalError | <code>Error</code> \| <code>undefined</code> | original Error instance |

<a name="isModelInterface"></a>

## isModelInterface ⇒ <code>boolean</code>
Since we allow projects to implement their own model (while providing ours
as drop-in) we still need to validate, whether they implement the model
correctly.

We duck-type check if the model implements the most important functions.
Uses the following values to check:
- 'getAuthorizationCode',
- 'getClient',
- 'getRefreshToken',
- 'revokeAuthorizationCode',
- 'saveAuthorizationCode',
- 'saveRefreshToken',
- 'saveToken',
- 'getAccessToken'

**Kind**: global constant  
**Returns**: <code>boolean</code> - true if valid, otherwise false  

| Param | Type | Description |
| --- | --- | --- |
| model | <code>Object</code> | the model implementation |

<a name="UserValidation"></a>

## UserValidation
Used to register handlers for different instances that validate users.
This allows you to validate user access on a client-based level.

**Kind**: global constant  
<a name="UserValidation.isValid"></a>

### UserValidation.isValid(instance, handlerArgs) ⇒ <code>\*</code>
Delegates `handlerArgs` to the registered validation handler.

**Kind**: static method of [<code>UserValidation</code>](#UserValidation)  
**Returns**: <code>\*</code> - should return truthy/falsy value  

| Param | Type |
| --- | --- |
| instance | [<code>OAuth2Server</code>](#OAuth2Server) | 
| handlerArgs | <code>\*</code> | 

<a name="app"></a>

## app : <code>Object</code>
Wrapped `WebApp` with express-style get/post and default use routes.

**Kind**: global constant  
**See**: https://docs.meteor.com/packages/webapp.html  

* [app](#app) : <code>Object</code>
    * [.get(url, handler)](#app.get)
    * [.post(url, handler)](#app.post)
    * [.use(args)](#app.use)

<a name="app.get"></a>

### app.get(url, handler)
Creates a get route for a given handler

**Kind**: static method of [<code>app</code>](#app)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| handler | <code>function</code> | 

<a name="app.post"></a>

### app.post(url, handler)
Creates a post route for a given handler.
If headers' content-type does not equal to `application/x-www-form-urlencoded`
then it will be transformed accordingly.

**Kind**: static method of [<code>app</code>](#app)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| handler | <code>function</code> | 

<a name="app.use"></a>

### app.use(args)
Default wrapper around `WebApp.use`

**Kind**: static method of [<code>app</code>](#app)  

| Param |
| --- |
| args | 

