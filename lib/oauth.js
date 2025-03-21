/* eslint-env mocha */
import { Meteor } from 'meteor/meteor'
import { check } from 'meteor/check'
import { Accounts } from 'meteor/accounts-base'
import * as Log from './utils/console'

// utils
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
import { requiredRefreshTokenPostParams } from './validation/requiredRefreshTokenPostParams'
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

const { Request, Response } = OAuthserver

/**
 * Publishes all authorized clients for the current authenticated user.
 * Does not touch any other user-related fields.
 * Allows to inject a custom publication-name.
 * @param pubName {string}
 * @return {function():Mongo.Cursor}
 * @private
 */
const publishAuthorizedClients = (pubName, debug) => {
  if (debug) {
    Log.debug('publish authorized clients as', pubName)
  }
  return Meteor.publish(pubName, function () {
    if (!this.userId) {
      return this.ready()
    }
    return Meteor.users.find({ _id: this.userId }, { fields: { 'oauth.authorizedClients': 1 } })
  })
}

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
   * @param logError
   * @return {OAuth2Server}
   */
  constructor ({ serverOptions = {}, model, routes, debug, logError } = {}) {
    check(serverOptions, OptionsSchema.serverOptions)
    if (debug) {
      Log.debug('create new instance')
      Log.debug('serveroptions', serverOptions)
    }
    this.instanceId = Random.id()
    this.config = {
      serverOptions: Object.assign({}, OAuth2ServerDefaults.serverOptions, serverOptions),
      routes: Object.assign({}, OAuth2ServerDefaults.routes, routes)
    }

    if (isModelInterface(model)) {
      // if we have passed our own model instance we directly assign it as model,
      this.config.model = null
      this.model = model
    } else {
      // otherwise we save the config and instantiate our default model
      this.config.model = Object.assign({}, OAuth2ServerDefaults.model, model)
      this.model = new OAuthMeteorModel(this.config.model)
    }

    this.app = app
    this.debug = debug
    this.logError = logError

    const oauthOptions = Object.assign({ model: this.model }, serverOptions)
    this.oauth = new OAuthserver(oauthOptions)

    const authorizedPubName = (serverOptions && serverOptions.authorizedPublicationName) || 'authorizedOAuth'
    publishAuthorizedClients(authorizedPubName, this.debug)
    initRoutes(this, routes)
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
   * @returns {object}
   */
  async registerClient ({ title, homepage, description, privacyLink, redirectUris, grants, clientId, secret }) {
    return this.model.createClient({
      title,
      homepage,
      description,
      privacyLink,
      redirectUris,
      grants,
      clientId,
      secret
    })
  }

  /**
   * @private
   */
  authorizeHandler (options) {
    const self = this
    return async function (req, res, next) {
      const request = new Request(req)
      const response = new Response(res)

      try {
        const code = await self.oauth.authorize(request, response, options)
        Log.debug('authorization code', code)
        res.locals.oauth = { code: code }
        next()
      } catch (err) {
        res.status(500).json(err)
      }
    }
  }

  /**
   * @private
   */
  authenticateHandler (options) {
    const self = this
    return async function (req, res, next) {
      const request = new Request(req)
      const response = new Response(res)

      try {
        const token = await self.oauth.authenticate(request, response, options)
        req.data = Object.assign({}, req.data, token)
        next()
      } catch (err) {
        return errorHandler(res, {
          status: err.status,
          error: err.name,
          description: err.message,
          debug: self.debug,
          logError: self.logError
        })
      }
    }
  }

  /**
   * Allows to create `get` or `post` routes, that are only
   * accessible to authenticated users.
   * @param options {object?} optional options
   * @param options.scope {string} optional scope to check. Model must implement {verifyScope} if used!
   * @return {{get:function, post:function}}
   */
  authenticatedRoute (options = {}) {
    const self = this
    let authOptions
    if (options.scope) {
      authOptions = {
        addAcceptedScopesHeader: true,
        addAuthorizedScopesHeader: true,
        scope: options.scope
      }
    }
    const authHandler = self.authenticateHandler(authOptions)
    return {
      get (route, fn) {
        app.get(route, authHandler, secureHandler(self, fn))
      },
      post (route, fn) {
        app.post(route, authHandler, secureHandler(self, fn))
      }
    }
  }
}

const initRoutes = (self, {
  accessTokenUrl = '/oauth/token',
  authorizeUrl = '/oauth/authorize'
} = {}) => {
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

  const getValidatedClient = async (req, res) => {
    const clientId = req.method.toLowerCase() === 'get' ? req.query.client_id : req.body.client_id
    const secret = req.method.toLowerCase() === 'get' ? req.query.client_secret : req.body.client_secret
    const client = await self.model.getClient(clientId, secret)

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

  const route = ({ method, url, description, handler }) => {
    const wrapper = async function (req, res, next) {
      const that = this
      try {
        return handler.call(that, req, res, next)
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
    }

    const handlers = []

    if (self.debug) {
      const debugMiddleware = getDebugMiddleWare(self, { description })
      handlers.push(debugMiddleware)
      Log.debug('Create route', method, url)
    }

    handlers.push(wrapper)

    switch (method) {
      case 'get': return app.get(url, ...handlers)
      case 'post': return app.post(url, ...handlers)
      default: return app.use(url, ...handlers)
    }
  }

  // STEP 1: VALIDATE CLIENT REQUEST
  // Note from https://www.oauth.com/oauth2-servers/authorization/the-authorization-response/
  // If there is something wrong with the syntax of the request, such as the redirect_uri or client_id is invalid,
  // then it’s important not to redirect the user and instead you should show the error message directly.
  // This is to avoid letting your authorization server be used as an open redirector.
  route({
    method: 'get',
    url: authorizeUrl,
    description: 'step 1 - validate initial request',
    handler: async function (req, res, next) {
      if (!validateParams(req.query, requiredAuthorizeGetParams, self.debug)) {
        return errorHandler(res, {
          status: 400,
          error: 'invalid_request',
          description: 'One or more request parameters are invalid',
          state: req.query.state,
          debug: self.debug
        })
      }

      const validResponseType = validateResponseType(req, res)
      if (!validResponseType) return res.end()

      const client = await getValidatedClient(req, res)
      if (!client) return res.end()

      const redirectUri = getValidatedRedirectUri(req, res, client)
      if (!redirectUri) return res.end()

      next()
    }
  })

  // STEP 2: ADD USER TO THE REQUEST
  // validate all inputs again, since all inputs
  // could have been manipulated within the form
  route({
    method: 'post',
    url: authorizeUrl,
    description: 'step 2 - add user to request',
    handler: async function (req, res, next) {
      if (!validateParams(req.body, requiredAuthorizePostParams, self.debug)) {
        return errorHandler(res, {
          error: 'invalid_request',
          description: 'One or more request parameters are invalid',
          state: req.body.state,
          debug: self.debug,
          status: 400
        })
      }

      const client = await getValidatedClient(req, res)
      if (!client) return

      const validRedirectUri = getValidatedRedirectUri(req, res, client)
      if (!validRedirectUri) return

      // token refers here to the Meteor.loginToken,
      // which is assigned, once the user has been validly logged-in
      // only valid tokens can be used to find a user
      // in the Meteor.users collection
      const user = await Meteor.users.findOneAsync({
        'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(req.body.token)
      })

      // we fail already here if no user has been found
      // since the oauth-node sever would repsond with a
      // 503 error, while it should be a 400
      const validateUserCredentials = { user, client }

      if (!user || !(await UserValidation.isValid(self, validateUserCredentials))) {
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

      const updateDoc = req.body.allowed === 'false'
        ? { $pull: { 'oauth.authorizedClients': client.clientId } }
        : { $addToSet: { 'oauth.authorizedClients': client.clientId } }

      await Meteor.users.updateAsync(id, updateDoc)

      // make this work on a post route
      req.query.allowed = req.body.allowed

      return next()
    }
  })

  // STEP 3: GENERATE AUTHORIZATION CODE RESPONSE
  // - use the user form the prior middleware for the authentication handler
  // - on allow, assign the client_id to the user's authorized clients
  // - on deny, ...?
  // - construct the redirect query and redirect to the redirect_uri
  route({
    method: 'post',
    url: authorizeUrl,
    description: 'step 3 - authorization code response',
    handler: async function (req, res /*, next */) {
      const request = new Request(req)
      const response = new Response(res)
      const authorizeOptions = {
        authenticateHandler: {
          handle: function (request, response) {
            return request.user
          }
        }
      }

      try {
        const code = await self.oauth.authorize(request, response, authorizeOptions)
        const query = new URLSearchParams({
          code: code.authorizationCode,
          user: req.user.id,
          state: req.body.state
        })

        const finalRedirectUri = `${req.body.redirect_uri}?${query}`
        res.redirect(302, finalRedirectUri)
      } catch (err) {
        errorHandler(res, {
          originalError: err,
          error: err.name,
          description: err.message,
          status: err.statusCode,
          state: req.body.state,
          debug: self.debug
        })
      }
    }
  })

  // STEP 4: GENERATE ACCESS TOKEN RESPONSE
  // - validate params
  // - validate authorization code
  // - issue accessToken and refreshToken
  route({
    method: 'post',
    url: accessTokenUrl,
    description: 'step 4 - generate access token response',
    handler: async function (req, res /*, next */) {
      if (!validateParams(req.body, req.body?.refresh_token ? requiredRefreshTokenPostParams : requiredAccessTokenPostParams, self.debug)) {
        return errorHandler(res, {
          status: 400,
          error: 'invalid_request',
          description: 'One or more request parameters are invalid',
          state: req.body.state,
          debug: self.debug
        })
      }

      // XXX: conformity for the token endpoint
      req.headers['Content-Type'] = 'application/x-www-form-urlencoded'

      const request = new Request(req)
      const response = new Response(res)

      try {
        const token = await self.oauth.token(request, response)
        res
          .set({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
          .status(200)
          .json({
            access_token: token.accessToken,
            token_type: 'bearer',
            expires_in: token.accessTokenExpiresAt,
            refresh_token: token.refreshToken
          })
      } catch (err) {
        return errorHandler(res, {
          error: 'unauthorized_client',
          description: err.message,
          state: req.body.state,
          debug: self.debug,
          status: err.statusCode
        })
      }
    }
  })
}
