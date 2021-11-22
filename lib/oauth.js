/* global Accounts, Npm */
import { Meteor } from 'meteor/meteor'
import { check } from 'meteor/check'
import { OAuthMeteorModel } from './model/model'
import {
  validate,
  requiredAuthorizeGetParams,
  requiredAuthorizePostParams,
  OAuth2ServerOptionsSchema,
  requiredAccessTokenPostParams
} from './validation'
import { app } from './webapp'
import { errorHandler } from './error'
import { isModelInterface } from './utils/isModelInterface'
import { OAuth2ServerDefaults } from './defaults'
import { Random } from 'meteor/random'
import { UserValidation } from './userValidation'

const URLSearchParams = require('url').URLSearchParams
const OAuthserver = Npm.require('@node-oauth/oauth2-server')

const bind = fn => Meteor.bindEnvironment(fn)

const { Request } = OAuthserver
const { Response } = OAuthserver

const getDebugMiddleWare = instance => (req, res, next) => {
  if (instance.debug === true) {
    const baseUrl = req.originalUrl.split('?')[0]
    console.debug('[OAuth2Server]', req.method, baseUrl, req.query || req.body)
  }
  return next()
}

const publishAuhorizedClients = (pubName) => {
  return Meteor.publish(pubName, function () {
    if (!this.userId) {
      return this.ready()
    }
    return Meteor.users.find({ _id: this.userId }, { fields: { 'oauth.authorizedClients': 1 } })
  })
}

const secureHandler = (self, handler) => bind(function (req, res, next) {
  const that = this
  try {
    handler.call(that, req, res, next)
  } catch (unknownException) {
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
})

const isValidUser = function (instanceId, user, debug = false) {
  // we assume, that if there is no validation handler registered
  // then the developers intended to do so. However, we will print an info.
  if (!UserValidation.isRegistered(instanceId)) {
    if (debug) {
      console.debug('[OAuth2Server]: skip user validation')
    }
    return true
  }

  try {
    return UserValidation.isValid(instanceId, user)
  } catch (e) {
    if (debug) {
      console.debug('[OAuth2Server]: isValidUser failed with exception', e.message, e.reason, e.details)
    }

    return false
  }
}

class OAuth2Server {
  constructor ({ serverOptions = {}, model, routes, debug } = {}) {
    check(serverOptions, OAuth2ServerOptionsSchema.serverOptions)

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

    const authorizedPubName = (serverOptions && serverOptions.authorizedPublicationName) || 'authorizedOAuth'
    publishAuhorizedClients(authorizedPubName)
    this.initRoutes(routes)
    return this
  }

  validateUser (fct) {
    check(fct, Function)
    UserValidation.register(this.instanceId, fct)
  }

  /**
   * Registers a new client app. Make sure that only users with permission (ie devs, admins) can call this function
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

  initRoutes ({ accessTokenUrl = '/oauth/token', authorizeUrl = '/oauth/authorize', errorUrl = '/oauth/error', fallbackUrl = '/oauth/*' } = {}) {
    const self = this
    const debugMiddleware = getDebugMiddleWare(self)

    const validateResponseType = (req, res) => {
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

    const getValidatedClient = (req, res) => {
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

    const getValidatedRedirectUri = (req, res, client) => {
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

    const route = (method, url, handler) => {
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
        } catch (unknownException) {
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

    // STEP 1: VALIDATE CLIENT REQUEST
    // Note from https://www.oauth.com/oauth2-servers/authorization/the-authorization-response/
    // If there is something wrong with the syntax of the request, such as the redirect_uri or client_id is invalid,
    // then it’s important not to redirect the user and instead you should show the error message directly.
    // This is to avoid letting your authorization server be used as an open redirector.
    route('get', authorizeUrl, function (req, res, next) {
      if (!validate(req.query, requiredAuthorizeGetParams, self.debug)) {
        return errorHandler(res, {
          status: 400,
          error: 'invalid_request',
          description: 'One or more request parameters are invalid',
          state: req.query.state,
          debug: self.debug
        })
      }

      const validResponseType = validateResponseType(req, res)
      if (!validResponseType) return

      const client = getValidatedClient(req, res)
      if (!client) return

      const redirectUri = getValidatedRedirectUri(req, res, client)
      if (!redirectUri) return

      return next()
    })

    // STEP 2: ADD USER TO THE REQUEST
    // validate all inputs again, since all inputs
    // could have been manipulated within form
    route('post', authorizeUrl, function (req, res, next) {
      if (!validate(req.body, requiredAuthorizePostParams, self.debug)) {
        return errorHandler(res, {
          error: 'invalid_request',
          description: 'One or more request parameters are invalid',
          state: req.body.state,
          debug: self.debug,
          status: 400
        })
      }

      const client = getValidatedClient(req, res)
      if (!client) return

      const validRedirectUri = getValidatedRedirectUri(req, res, client)
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
      const { instanceId, debug } = self

      if (!user || !isValidUser(instanceId, validateUserCredentials, debug)) {
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
      } else {
        Meteor.users.update(id, { $addToSet: { 'oauth.authorizedClients': client.clientId } })
      }

      // make this work on a post route
      req.query.allowed = req.body.allowed

      return next()
    })

    // STEP 3: GENERATE AUTHORIZATION CODE RESPONSE
    // - use the user form the prior middleware for the authentication handler
    // - on allow, assign the client_id to the user's authorized clients
    // - on deny, ...?
    // - construct the redirect query and redirect to the redirect_uri
    route('post', authorizeUrl, function (req, res /*, next */) {
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

    // STEP 4: GENERATE ACCESS TOKEN RESPONSE
    // - validate params
    // - validate authorization code
    // - issue accessToken and refreshToken
    route('post', accessTokenUrl, function (req, res, next) {
      if (!validate(req.body, requiredAccessTokenPostParams, self.debug)) {
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

    route('use', fallbackUrl, function (req, res, next) {
      return errorHandler(res, {
        error: 'route not found',
        status: 404,
        debug: self.debug
      })
    })
  }
}

export { OAuth2Server }
