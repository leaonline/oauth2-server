const name = `[OAuth2Server]`

const getHandler = type => {
  const target = console[type]
  return (...args) => target(name, ...args)
}

export const info = getHandler('info')
export const debug = getHandler('debug')
export const warn = getHandler('warn')
export const error = getHandler('error')
