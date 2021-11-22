import { Meteor } from "meteor/meteor"

export const bind = fn => Meteor.bindEnvironment(fn)
