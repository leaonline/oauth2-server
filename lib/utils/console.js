const name = `[OAuth2Server]`

const getHandler = type => {
  const target = console[type]
  return (...args) => target(name, ...args)
}

const log = getHandler('log')
const info = getHandler('info')
const debug = getHandler('debug')
const warn = getHandler('warn')
const error = getHandler('error')
/**
 *
 * A wrapper for console-based logs
 * @type {{log: function, info: function, debug: function, warn: function, error: function}}
 */
export {log, info, debug, warn, error }
