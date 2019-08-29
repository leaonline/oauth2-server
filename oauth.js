/* global Accounts, Npm */
import { Meteor } from 'meteor/meteor'
import { Model } from './model'
import { validate, requiredAuthorizeGetParams } from './validation'
import { app } from './webapp'
import { errorHandler } from './error'

const OAuthserver = Npm.require('oauth2-server')

const bind = fn => Meteor.bindEnvironment(fn)

const { Request } = OAuthserver
const { Response } = OAuthserver

const getDebugMiddleWare = instance => (req, res, next) => {
  if (instance.debug === true) {
    console.log('[OAuth2Server]', req.method, req.url, req.params, req.body)
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
  registerClient ({ title, homepage, description, privacyLink, redirectUris }) {
    return this.model.createClient({ title, homepage, description, privacyLink, redirectUris })
  }

  authorizeHandler (options) {
    return function (req, res, next) {
      let request = new Request(req)
      let response = new Response(res)
      return this.oauth.authorize(request, response, options)
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
    return function (req, res, next) {
      let request = new Request(req)
      let response = new Response(res)
      return this.oauth.authenticate(request, response, options)
        .then(function (token) {
          res.locals.oauth = { token: token }
          next()
        })
        .catch(function (err) {
          // handle error condition
          console.error(err)
        })
    }
  }

  authenticatedRoute (route, fn) {
    return this.app.use(route, getDebugMiddleWare(this), this.authenticateHandler(), fn)
  }

  initRoutes ({ accessTokenUrl = '/oauth/token', authorizeUrl = '/oauth/authorize', errorUrl = '/oauth/error', fallbackUrl = '/oauth/*' } = {}) {
    const self = this
    const debugMiddleware = getDebugMiddleWare(self)

    const route = (method, url, handler) => {
      const targetFn = this.app[ method ]
      if (self.debug) {
        targetFn.call(this.app, url, debugMiddleware)
      }

      // we automatically bound any route
      // to ensure a functional fiber running
      // and to support Meteor and Mongo features
      targetFn.call(this.app, url, bind(function (req, res, next) {
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
      if (!validate(req.query, requiredAuthorizeGetParams)) {
        return errorHandler(res, {
          error: 'invalid_request',
          description: 'One or more request parameters are invalid',
          state: req.query.state,
          debug: self.debug
        })
      }

      const client = Promise.await(self.model.getClient(req.query.client_id))
      if (!client) {
        // unauthorized_client - The client is not authorized to request an authorization code using this method.
        return errorHandler(res, {
          error: 'unauthorized_client',
          description: 'This client is not authorized to use this service',
          state: req.query.state,
          debug: self.debug
        })
      }

      const redirectUris = [].concat(client.redirectUris)
      if (redirectUris.indexOf(req.query.redirect_uri) === -1) {
        return errorHandler(res, {
          error: 'invalid_request',
          description: 'Invalid redirect URI',
          state: req.query.state,
          debug: self.debug
        })
      }

      return next()
    })

    // STEP 2: ADD USER TO THE REQUEST
    // error out if user not found, e.g. a cold false token attemp
    // via the form
    route('post', authorizeUrl, function (req, res, next) {
      if (!req.body.token) {
        return res.sendStatus(401).send('No token')
      }

      const user = Meteor.users.findOne({
        'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(req.body.token)
      })

      if (!user) {
        return res.sendStatus(401).send('Invalid token')
      }

      req.user = { id: user._id }
      return next()
    })

    route('post', authorizeUrl, function (req, next) {
      if (req.body.allow === 'yes') {
        Meteor.users.update(req.user.id, { $addToSet: { 'oauth.authorizedClients': this.clientId } })
      }

      return next(null, req.body.allow === 'yes', req.user)
    })

    route('use', accessTokenUrl, function (req, res, next) {
      let request = new Request(req)
      let response = new Response(res)
      return this.oauth.token(request, response)
        .then(function (token) {
          console.log('token generated')
          console.log(token)
          res.locals.oauth = { token: token }
          next()
        })
        .catch(function (err) {
          // handle error condition
          console.error(err)
        })
    })

    route('use', fallbackUrl, function (req, res, next) {
      return errorHandler(res, { error: 'route not found', status: 404, debug: self.debug })
    })
  }
}
