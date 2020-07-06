import {
  isFunction,
  isArray,
  isInstanceOf,
} from 'ts-fns'

import { createType } from './rules.js'

export class Ty {
  constructor() {
    this._listeners = []
    this._silent = false
  }

  bind(fn) {
    if (isFunction(fn)) {
      this._listeners.push(fn)
    }
    return this
  }
  unbind(fn) {
    this._listeners.forEach((item, i) => {
      if (item === fn) {
        this._listeners.splice(i, 1)
      }
    })
    return this
  }
  dispatch(error) {
    this._listeners.forEach((fn) => {
      Promise.resolve().then(() => fn.call(this, error))
    })
    return this
  }

  silent(value) {
    this._silent = !!value
  }
  throw(error) {
    this.dispatch(error)

    if (!this._silent) {
      throw error
    }
  }

  /**
   * @example
   * ty.expect(10).to.match(Number)
   */
  expect(value) {
    return {
      to: {
        match: (type) => {
          type = createType(type)

          try {
            type.assert(value)
            return true
          }
          catch (e) {
            this.throw(e)
            return false
          }
        },
        be: (type) => {
          return this.expect(value).to.match(type)
        },
      },
    }
  }

  /**
   * @example
   * let error = ty.catch(10).by(Number)
   */
  catch(value) {
    return {
      by: (type) => {
        type = createType(type)

        let error = type.catch(value)
        if (error) {
          this.dispatch(error)
        }
        return error
      },
    }
  }

  /**
   * @example
   * ty.trace('10').by(Number)
   */
  trace(value) {
    return {
      by: (type) => {
        type = createType(type)

        return type.trace(value).catch(error => this.throw(error))
      },
    }
  }

  /**
   * @example
   * ty.track('10').by(Number)
   */
  track(value) {
    return {
      by: (type) => {
        type = createType(type)

        return type.track(value).catch(error => this.throw(error))
      },
    }
  }

  /**
   * determine whether type match
   * @example
   * let bool = ty.is(Number).typeof(10)
   * let bool = ty.is(10).of(Number)
   */
  is(arg) {
    return {
      typeof: (value) => {
        let type = arg
        type = createType(type)

        let error = type.catch(value)
        if (error) {
          this.dispatch(error)
        }
        return !error
      },
      of: (type) => this.is(type).typeof(arg),
    }
  }

  /**
   * @param {string|undefined} which input|output
   * @example
   * @ty.decorate('input').with((value) => SomeType.assert(value))
   */
  decorate(what) {
    const $this = this
    return {
      with: (type) => (target, prop, descriptor) => {
        // decorate class constructor function
        if (target && !prop) {
          if (what !== 'input' && what !== 'output') {
            return class extends target {
              constructor(...args) {
                $this.expect(args).to.be(type)
                super(...args)
              }
            }
          }
          else {
            return target
          }
        }
        // decorate class member
        else if (prop) {
          // change the property
          if (what !== 'input' && what !== 'output') {
            descriptor.set = (value) => {
              this.expect(value).to.be(type)
              descriptor.value = value
            }
          }

          // what
          if (typeof property === 'function' && (what === 'input' || what === 'output')) {
            const property = descriptor.value
            const wrapper = function(...args) {
              if (what === 'input') {
                type = isInstanceOf(type, Tuple) ? type : isArray(type) ? new Tuple(type) : new Tuple([type])
                $this.expect(args).to.be(type)
              }
              const result = property.call(this, ...args)
              if (what === 'output') {
                $this.expect(result).to.be(type)
              }
              return result
            }
            descriptor.value = wrapper
          }

          return descriptor
        }
        else {
          return descriptor
        }
      }
    }
  }
}

const ty = new Ty()

Ty.expect = ty.expect.bind(ty)
Ty.catch = ty.catch.bind(ty)
Ty.trace = ty.trace.bind(ty)
Ty.track = ty.track.bind(ty)
Ty.is = ty.is.bind(ty)
Ty.decorate = ty.decorate.bind(ty)
Ty.create = createType

export default Ty
