import { Meteor } from 'meteor/meteor'

/**
 * Binds a function to the Meteor environment and Fiber
 * @param fn {function}
 * @return {function} the bound function
 */
export const bind = fn => Meteor.bindEnvironment(fn)
