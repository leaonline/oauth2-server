import bodyParser from 'body-parser'
import { WebApp } from 'meteor/webapp'

/**
 * Wrapped `WebApp` with express-style get/post and default use routes.
 * @see https://docs.meteor.com/packages/webapp.html
 * @type {{get: get, post: post, use: use}}
 */
export const app = WebApp.handlers

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
