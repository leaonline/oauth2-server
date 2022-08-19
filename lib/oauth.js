import { Meteor } from 'meteor/meteor'
import { check } from 'meteor/check'
import { Accounts } from 'meteor/accounts-base'

// utils
import { bind } from './utils/bind'
import { getDebugMiddleWare } from './middleware/getDebugMiddleware'

// model
import { OAuthMeteorModel } from './model/model'
import { isModelInterface } from './utils/isModelInterface'
import { OAuth2ServerDefaults } from './defaults'

// validation
import { validateParams } from './validation/validateParams'
import { requiredAuthorizeGetParams } from './validation/requiredAuthorizeGetParams'
import { requiredAuthorizePostParams } from './validation/requiredAuthorizePostParams'
import { requiredAccessTokenPostParams } from './validation/requiredAccessTokenPostParams'
import { UserValidation } from './validation/UserValidation'
import { OptionsSchema } from './validation/OptionsSchema'

// webapp / http
import { app } from './webapp'
import { errorHandler } from './utils/error'
import { Random } from 'meteor/random'
import { URLSearchParams } from 'url'
import { secureHandler } from './middleware/secureHandler'

// oauth
import OAuthserver from '@node-oauth/oauth2-server'
import { requiredRefreshTokenPostParams } from './validation/requiredRefreshTokenPostParams'

const { Request, Response } = OAuthserver

/**
 * The base class of this package.
 * Represents an oauth2-server with a default model setup for Meteor/Mongo.
 */
export class OAuth2Server {
  /**
   * Creates a new OAuth2 server instance.
   * @param serverOptions
   * @param model
   * @param routes
   * @param debug
   * @return {OAuth2Server}
   */
  constructor ({ serverOptions = {}, model, routes, debug } = {}) {
    check(serverOptions, OptionsSchema.serverOptions)

    this.instanceId = Random.id()
    this.config = {
      serverOptions: Object.assign({}, OAuth2ServerDefaults.serverOptions, serverOptions),
      routes: Object.assign({}, OAuth2ServerDefaults.routes, routes)
    }

    // if we have passed our own model instance we directly assign it as model,
    if (isModelInterface(model)) {
      this.config.model = null
      this.model = model
    }

    // otherwise we save the config and instantiate our default model
    else {
      this.config.model = Object.assign({}, OAuth2ServerDefaults.model, model)
      this.model = new OAuthMeteorModel(this.config.model)
    }

    this.app = app
    this.debug = debug

    const oauthOptions = Object.assign({ model: this.model }, serverOptions)
    this.oauth = new OAuthserver(oauthOptions)

    this.validateClientRequest()
    this.addUserToRequest()
    this.generateAuthorizationCodeResponse()
    this.generateAccessTokenResponse()
    return this
  }

  /**
   * Registers a function to validate a user. The handler receives the current
   * authenticated user and client and should return a truthy or falsy value to
   * determine, whether the given user is valid for a given client.
   * Notation: `{ user, client } => Boolean`
   * @param fct {function}
   */
  validateUser (fct) {
    check(fct, Function)
    const self = this
    UserValidation.register(self, fct)
  }

  /**
   * Registers a new client app. Make sure that only users with permission
   * (ie devs, admins) can call this function.
   * @param title
   * @param homepage
   * @param description
   * @param privacyLink
   * @param redirectUris
   * @param grants
   * @param clientId
   * @param secret
   * @returns {}
   */
  registerClient ({ title, homepage, description, privacyLink, redirectUris, grants, clientId, secret }) {
    const self = this
    return Promise.await(self.model.createClient({
      title,
      homepage,
      description,
      privacyLink,
      redirectUris,
      grants,
      clientId,
      secret
    }))
  }

  authorizeHandler (options) {
    const self = this
    return function (req, res, next) {
      const request = new Request(req)
      const response = new Response(res)
      return self.oauth.authorize(request, response, options)
        .then(function (code) {
          res.locals.oauth = { code: code }
          next()
        })
        .catch(function (err) {
          // handle error condition
          res.writeHead(500)
          res.end(err)
        })
    }
  }

  authenticateHandler (options) {
    const self = this
    return function (req, res, next) {
      const request = new Request(req)
      const response = new Response(res)
      return self.oauth.authenticate(request, response, options)
        .then(function (token) {
          req.data = Object.assign({}, req.data, token)
          next()
        })
        .catch(function (err) {
          return errorHandler(res, {
            status: err.status,
            error: err.name,
            description: err.message,
            debug: self.debug
          })
        })
    }
  }

  /**
   * Allows to create `get` or `post` routes, that are only
   * accessible to authenticated users.
   * @return {{get:function, post:function}}
   */
  authenticatedRoute () {
    const self = this
    const debugMiddleware = getDebugMiddleWare(self)
    const authHandler = self.authenticateHandler()
    return {
      get (route, fn) {
        app.get(route, debugMiddleware)
        app.get(route, authHandler)
        app.get(route, secureHandler(self, fn))
      },
      post (route, fn) {
        return app.post(route, debugMiddleware, authHandler, fn)
      }
    }
  }

  // STEP 1: VALIDATE CLIENT REQUEST
  // Note from https://www.oauth.com/oauth2-servers/authorization/the-authorization-response/
  // If there is something wrong with the syntax of the request, such as the redirect_uri or client_id is invalid,
  // then it’s important not to redirect the user and instead you should show the error message directly.
  // This is to avoid letting your authorization server be used as an open redirector.
  validateClientRequest () {
    const self = this
    const { authorizeUrl } = this.config.routes
    self.route('get', authorizeUrl, function (req, res, next) {
      const validRequestParams = self.validateRequestParams(req, requiredAuthorizeGetParams)
      if (!validRequestParams) return;

      const validResponseType = self.validateResponseType(req, res)
      if (!validResponseType) return

      const client = self.getValidatedClient(req, res)
      if (!client) return

      const redirectUri = self.getValidatedRedirectUri(req, res, client)
      if (!redirectUri) return

      return next()
    })
  }

  // STEP 2: ADD USER TO THE REQUEST
  // validate all inputs again, since all inputs
  // could have been manipulated within form
  addUserToRequest () {
    const self = this
    const { authorizeUrl } = this.config.routes
    self.route('post', authorizeUrl, function (req, res, next) {
      const validRequestParams = self.validateRequestParams(req, requiredAuthorizeGetParams)
      if (!validRequestParams) return;

      const client = self.getValidatedClient(req, res)
      if (!client) return

      const validRedirectUri = self.getValidatedRedirectUri(req, res, client)
      if (!validRedirectUri) return

      // token refers here to the Meteor.loginToken,
      // which is assigned, once the user has been validly logged-in
      // only valid tokens can be used to find a user
      // in the Meteor.users collection
      const user = Meteor.users.findOne({
        'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(req.body.token)
      })

      // we fail already here if no user has been found
      // since the oauth-node sever would repsond with a
      // 503 error, while it should be a 400
      const validateUserCredentials = { user, client }

      if (!user || !UserValidation.isValid(self, validateUserCredentials)) {
        return errorHandler(res, {
          status: 400,
          error: 'access_denied',
          description: 'You are no valid user',
          state: req.body.state,
          debug: self.debug
        })
      }

      const id = user._id
      req.user = { id } // TODO add fields from scope

      if (req.body.allowed === 'false') {
        Meteor.users.update(id, { $pull: { 'oauth.authorizedClients': client.clientId } })
      }
      else {
        Meteor.users.update(id, { $addToSet: { 'oauth.authorizedClients': client.clientId } })
      }

      // make this work on a post route
      req.query.allowed = req.body.allowed

      return next()
    })
  }

  generateAuthorizationCodeResponse () {
    const self = this
    const { authorizeUrl } = this.config.routes
    // STEP 3: GENERATE AUTHORIZATION CODE RESPONSE
    // - use the user form the prior middleware for the authentication handler
    // - on allow, assign the client_id to the user's authorized clients
    // - on deny, ...?
    // - construct the redirect query and redirect to the redirect_uri
    self.route('post', authorizeUrl, function (req, res /*, next */) {
      const request = new Request(req)
      const response = new Response(res)
      const authorizeOptions = {
        authenticateHandler: {
          handle: function (request, response) {
            return request.user
          }
        }
      }

      return self.oauth.authorize(request, response, authorizeOptions)
        .then(bind(function (code) {
          const query = new URLSearchParams({
            code: code.authorizationCode,
            user: req.user.id,
            state: req.body.state
          })

          const finalRedirectUri = `${req.body.redirect_uri}?${query}`

          res.statusCode = 302
          res.setHeader('Location', finalRedirectUri)
          res.end()
        }))
        .catch(function (err) {
          errorHandler(res, {
            originalError: err,
            error: err.name,
            description: err.message,
            status: err.statusCode,
            state: req.body.state,
            debug: self.debug
          })
        })
    })
  }

  generateAccessTokenResponse () {
    const self = this
    const { accessTokenUrl } = this.config.routes
    // STEP 4: GENERATE ACCESS TOKEN RESPONSE
    // - validate params
    // - validate authorization code
    // - issue accessToken and refreshToken
    self.route('post', accessTokenUrl, function (req, res, next) {
      if (!validateParams(req.body, requiredAccessTokenPostParams, self.debug) 
          && !validateParams(req.body, requiredRefreshTokenPostParams, self.debug)
        ) {
        return errorHandler(res, {
          status: 400,
          error: 'invalid_request',
          description: 'One or more request parameters are invalid',
          state: req.body.state,
          debug: self.debug
        })
      }

      const request = new Request(req)
      const response = new Response(res)
      return self.oauth.token(request, response)
        .then(function (token) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
          const body = JSON.stringify({
            access_token: token.accessToken,
            token_type: 'bearer',
            expires_in: token.accessTokenExpiresAt,
            refresh_token: token.refreshToken
          })
          res.end(body)
        })
        .catch(function (err) {
          return errorHandler(res, {
            error: 'unauthorized_client',
            description: err.message,
            state: req.body.state,
            debug: self.debug,
            status: err.statusCode
          })
        })
    })
  }

  initFallbackRoutes () {
    const self = this
    const { fallbackUrl } = this.config.routes
    self.route('use', fallbackUrl, function (req, res, next) {
      return errorHandler(res, {
        error: 'route not found',
        status: 404,
        debug: self.debug
      })
    })
  }

  validateResponseType (req, res) {
    const self = this
    const responseType = req.method.toLowerCase() === 'get'
      ? req.query.response_type
      : req.body.response_type
    if (responseType !== 'code' && responseType !== 'token') {
      return errorHandler(res, {
        status: 415,
        error: 'unsupported_response_type',
        description: 'The response type is not supported by the authorization server.',
        state: req.query.state,
        debug: self.debug
      })
    }
    return true
  }

  validateRequestParams (req, expectedParams) {
    const self = this
    if (!validateParams(req.query, expectedParams, self.debug)) {
      return errorHandler(res, {
        status: 400,
        error: 'invalid_request',
        description: 'One or more request parameters are invalid',
        state: req.query.state,
        debug: self.debug
      })
    }
    return true
  }

  getValidatedClient (req, res) {
    const self = this
    const clientId = req.method.toLowerCase() === 'get' ? req.query.client_id : req.body.client_id
    const secret = req.method.toLowerCase() === 'get' ? req.query.client_secret : req.body.client_secret
    const client = Promise.await(self.model.getClient(clientId, secret))
    if (!client) {
      // unauthorized_client - The client is not authorized to request an authorization code using this method.
      return errorHandler(res, {
        status: 401,
        error: 'unauthorized_client',
        description: 'This client is not authorized to use this service',
        state: req.query.state,
        debug: self.debug
      })
    }
    return client
  }

  getValidatedRedirectUri (req, res, client) {
    const self = this
    const redirectUris = [].concat(client.redirectUris)
    const redirectUri = req.method.toLowerCase() === 'get' ? req.query.redirect_uri : req.body.redirect_uri
    if (redirectUris.indexOf(redirectUri) === -1) {
      return errorHandler(res, {
        error: 'invalid_request',
        description: `Invalid redirection uri ${redirectUri}`,
        state: req.query.state,
        debug: self.debug,
        status: 400
      })
    }
    return redirectUri
  }

  route (method, url, handler) {
    const self = this;
    const debugMiddleware = getDebugMiddleWare(self)
    const targetFn = self.app[method]
    if (self.debug) {
      targetFn.call(self.app, url, debugMiddleware)
    }

    // we automatically bound any route
    // to ensure a functional fiber running
    // and to support Meteor and Mongo features
    targetFn.call(self.app, url, bind(function (req, res, next) {
      const that = this
      try {
        handler.call(that, req, res, next)
      }
      catch (unknownException) {
        const state = req && req.query && req.query.state
        errorHandler(res, {
          error: 'server_error',
          status: 500,
          description: 'An internal server error occurred',
          state,
          debug: self.debug,
          originalError: unknownException
        })
      }
    }))
  }
}

export { requiredAuthorizeGetParams, requiredAuthorizePostParams, requiredRefreshTokenPostParams, requiredAccessTokenPostParams, UserValidation, errorHandler } 