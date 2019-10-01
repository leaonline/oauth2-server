/* global Accounts, Npm */
import { Meteor } from 'meteor/meteor'
import { Model } from './model'
import { validate, requiredAuthorizeGetParams, requiredAuthorizePostParams } from './validation'
import { app } from './webapp'
import { errorHandler } from './error'

const URLSearchParams = require('url').URLSearchParams
const OAuthserver = Npm.require('oauth2-server')

const bind = fn => Meteor.bindEnvironment(fn)

const { Request } = OAuthserver
const { Response } = OAuthserver

const getDebugMiddleWare = instance => (req, res, next) => {
  if (instance.debug === true) {
    const baseUrl = req.originalUrl.split('?')[ 0 ]
    console.log('[OAuth2Server]', req.method, baseUrl, req.query || req.body)
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

export const OAuth2Server = class OAuth2Server {
  constructor ({ serverOptions, model, routes, debug }) {
    this.config = { serverOptions, model, routes }
    this.model = new Model(model)
    this.app = app
    this.debug = debug

    const oauthOptions = Object.assign({ model: this.model }, serverOptions)
    this.oauth = new OAuthserver(oauthOptions)

    const authorizedPubName = serverOptions.authorizedPublicationName || 'authorizedOAuth'
    publishAuhorizedClients(authorizedPubName)
    this.initRoutes(routes)
    return this
  }

  /**
   * Registers a new client app. Make sure that only users with permission (ie devs, admins) can call this function
   * @param title
   * @param homepage
   * @param description
   * @param privacyLink
   * @param redirectUris
   * @returns {}
   */
  registerClient ({ title, homepage, description, privacyLink, redirectUris, grants }) {
    const self = this
    return self.model.createClient({ title, homepage, description, privacyLink, redirectUris, grants })
  }

  authorizeHandler (options) {
    const self = this
    return function (req, res, next) {
      let request = new Request(req)
      let response = new Response(res)
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
      console.log('auth handler')
      let request = new Request(req)
      let response = new Response(res)
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

    const getValidatedClient = (req, res) => {
      const clientId = req.method.toLowerCase() === 'get' ? req.query.client_id : req.body.client_id
      const client = Promise.await(self.model.getClient(clientId))
      if (!client) {
        // unauthorized_client - The client is not authorized to request an authorization code using this method.
        return errorHandler(res, {
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
          description: 'Invalid redirect URI',
          state: req.query.state,
          debug: self.debug
        })
      }
      return redirectUri
    }

    const route = (method, url, handler) => {
      const targetFn = self.app[ method ]
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

    route('use', accessTokenUrl, function (req, res, next) {
      let request = new Request(req)
      let response = new Response(res)
      console.log('access token::::', req.body)
      return self.oauth.token(request, response)
        .then(function (token) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
          })
          const body = JSON.stringify({
            'access_token': token.accessToken,
            'token_type': 'bearer',
            'expires_in': token.accessTokenExpiresAt,
            'refresh_token': token.refreshToken
          })
          res.end(body)
        })
        .catch(function (err) {
          // handle error condition
          return errorHandler(res, {
            error: 'unauthorized_client',
            description: err.message,
            state: req.query.state,
            debug: self.debug
          })
        })
    })

    // STEP 1: VALIDATE CLIENT REQUEST
    // Note from https://www.oauth.com/oauth2-servers/authorization/the-authorization-response/
    // If there is something wrong with the syntax of the request, such as the redirect_uri or client_id is invalid,
    // then it’s important not to redirect the user and instead you should show the error message directly.
    // This is to avoid letting your authorization server be used as an open redirector.
    route('get', authorizeUrl, function (req, res, next) {
      if (!validate(req.query, requiredAuthorizeGetParams)) {
        return errorHandler(res, {
          error: 'invalid_request',
          description: 'One or more request parameters are invalid',
          state: req.query.state,
          debug: self.debug
        })
      }
      const client = getValidatedClient(req, res)
      getValidatedRedirectUri(req, res, client)
      return next()
    })

    // STEP 2: ADD USER TO THE REQUEST
    // validate all inputs again, since all inputs
    // could have been manipulated within form
    route('post', authorizeUrl, function (req, res, next) {
      if (!validate(req.body, requiredAuthorizePostParams)) {
        return errorHandler(res, {
          error: 'invalid_request',
          description: 'One or more request parameters are invalid',
          state: req.query.state,
          debug: self.debug
        })
      }

      const client = getValidatedClient(req, res)
      getValidatedRedirectUri(req, res, client)

      if (!req.body.token) {
        return errorHandler(res, {
          error: 'noToken',
          description: 'no token is provided',
          status: 401,
          state: req.query.state,
          debug: self.debug
        })
      }

      const user = Meteor.users.findOne({
        'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(req.body.token)
      })

      if (!user) {
        return errorHandler(res, {
          error: 'invalidToken',
          description: 'The provided token is invalid',
          status: 401,
          state: req.query.state,
          debug: self.debug
        })
      }

      req.user = { id: user._id } // TODO add fields from scope
      return next()
    })

    route('post', authorizeUrl, function (req, res, next) {
      const request = new Request(req)
      const response = new Response(res)
      const authorizeOptions = {
        authenticateHandler: {
          handle (request, response) {
            return req.user
          }
        }
      }

      return self.oauth.authorize(request, response, authorizeOptions)
        .then(bind(function (code) {
          const clientId = req.body.client_id
          if (req.body.allow === 'yes') {
            console.log('update authorized clients')
            Meteor.users.update(req.user.id, { $addToSet: { 'oauth.authorizedClients': clientId } })
          } else {
            Meteor.users.update(req.user.id, { $pull: { 'oauth.authorizedClients': clientId } })
          }

          const query = new URLSearchParams({
            code: code.authorizationCode,
            user: req.user.id,
            state: req.body.state
          })
          const finalRedirectUri = `${req.body.redirect_uri}?${query}`
          res.writeHead(302, { 'Location': finalRedirectUri })
          res.end()
        }))
        .catch(function (err) {
          errorHandler(res, { error: err.message, originalError: err })
        })
    })

    route('use', fallbackUrl, function (req, res, next) {
      return errorHandler(res, { error: 'route not found', status: 404, debug: self.debug })
    })
  }
}
