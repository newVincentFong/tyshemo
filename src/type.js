import Prototype from './prototype.js'
import Rule from './rule.js'
import TyError, { makeError } from './error.js'
import { isArray, isObject, isInstanceOf, inArray, getInterface, inObject } from './utils.js'

export class Type {

  /**
   * create a Type instance
   * @param  {Any} pattern should be native prototypes or a Rule instance, i.e. String, Number, Boolean... Null, Any, Float...
   */
  constructor(pattern) {
    this.isStrict = false
    this.pattern = pattern
    this.name =  'Type'
  }

  /**
   * validate whether the argument match the pattern
   * @param {*} value
   * @param {*} pattern
   */
  validate(value, pattern) {
    if (arguments.length === 1) {
      pattern = this.pattern
    }

    const info = { type: this, level: 'type', action: 'validate' }

    // nested Type
    if (isInstanceOf(pattern, Type)) {
      if (this.isStrict && !pattern.isStrict) {
        pattern = pattern.strict
      }
      let error = pattern.catch(value)
      return makeError(error, info)
    }

    // check array
    if (isArray(pattern)) {
      if (!isArray(value)) {
        return new TyError('mistaken', { ...info, value, pattern })
      }

      // can be empty array
      if (!value.length) {
        return
      }

      let patterns = pattern
      let items = value
      let patternCount = patterns.length
      let itemCount = items.length

      const validate = (value, index, items, pattern) => {
        let error = null
        if (isInstanceOf(pattern, Rule)) {
          if (this.isStrict && !pattern.isStrict) {
            pattern = pattern.strict
          }
          error = pattern.validate2(value, index, items)
        }
        else {
          error = this.validate(value, pattern)
        }
        return error
      }
      const enumerate = (value, index, items, patterns) => {
        for (let i = 0, len = patterns.length; i < len; i ++) {
          let pattern = patterns[i]
          let error = validate(value, index, items, pattern)
          // if there is one match, break the loop
          if (!error) {
            return
          }
        }
        return new TyError('mistaken', { ...info, index, value, pattern: patterns, action: 'enumerate' })
      }

      for (let i = 0; i < itemCount; i ++) {
        let value = items[i]
        let error = null
        if (patternCount > 1) {
          error = enumerate(value, i, items, patterns)
          error = makeError(error, { ...info, index: i, value })
        }
        else {
          let pattern = patterns[0]
          error = validate(value, i, items, pattern)
          error = makeError(error, { ...info, index: i, value, pattern })
        }
        if (error) {
          return error
        }
      }

      return
    }

    // check object
    if (isObject(pattern)) {
      if (!isObject(value)) {
        return new TyError('mistaken', { ...info, value, pattern })
      }

      const patterns = pattern
      const data = value
      const patternKeys = Object.keys(patterns)
      const dataKeys = Object.keys(data)

      // in strict mode, keys should absolutely equal
      // properties should be absolutely same
      if (this.isStrict) {
        for (let i = 0, len = patternKeys.length; i < len; i ++) {
          let key = patternKeys[i]
          if (!inArray(key, dataKeys)) {
            return new TyError('missing', { ...info, key })
          }
        }
        for (let i = 0, len = dataKeys.length; i < len; i ++) {
          let key = dataKeys[i]
          if (!inArray(key, patternKeys)) {
            return new TyError('overflow', { ...info, key })
          }
        }
      }

      for (let i = 0, len = patternKeys.length; i < len; i ++) {
        let key = patternKeys[i]
        let value = data[key]
        let pattern = patterns[key]
        let isRule = isInstanceOf(pattern, Rule)

        if (isRule) {
          if (this.isStrict && !pattern.isStrict) {
            pattern = pattern.strict
          }

          let error = pattern.validate2(value, key, data)
          if (!error) {
            continue
          }

          // after validate2, the property may create by validate2
          if (!inObject(key, data)) {
            return new TyError('missing', { ...info, key })
          }

          return makeError(error, { ...info, key, value, pattern })
        }
        else {
          // not found some key in data
          // i.e. should be { name: String, age: Number } but give { name: 'tomy' }, 'age' is missing
          if (!inObject(key, data)) {
            return new TyError('missing', { ...info, key })
          }
        }

        // normal validate
        let error = this.validate(value, pattern)
        if (error) {
          return makeError(error, { ...info, key, value, pattern })
        }
      }

      return
    }

    // check prototypes
    if (Prototype.has(pattern)) {
      const res = Prototype.is(value).of(pattern)
      if (res === true) {
        return
      }
      return new TyError('mistaken', { ...info, value, pattern })
    }

    // check single value
    if (value === pattern) {
      return
    }

    return new TyError('mistaken', { ...info, value, pattern })
  }

  assert(value) {
    const pattern = this.pattern
    const info = { value, pattern, type: this, level: 'type', action: 'assert' }
    const error = this.validate(value, pattern)
    if (error) {
      throw makeError(error, info)
    }
  }
  catch(value) {
    try {
      this.assert(value)
      return null
    }
    catch (error) {
      return error
    }
  }
  test(value) {
    let error = this.catch(value)
    return !error
  }

  /**
   * track value with type sync
   * @param {*} value
   */
  track(value) {
    return new Promise((resolve, reject) => {
      let error = this.catch(value)
      if (error) {
        reject(error)
      }
      else {
        resolve()
      }
    })
  }

  /**
   * track value with type async
   * @param {*} value
   */
  trace(value) {
    return new Promise((resolve, reject) => {
      Promise.resolve().then(() => {
        let error = this.catch(value)
        if (error) {
          reject(error)
        }
        else {
          resolve()
        }
      })
    })
  }

  clone() {
    const Interface = getInterface(this)
    const ins = new Interface(this.pattern)
    return ins
  }

  toBeStrict(mode = true) {
    this.isStrict = !!mode
    return this
  }

  get strict() {
    const ins = this.clone()
    ins.toBeStrict()
    return ins
  }
  get Strict() {
    return this.strict
  }

  // use name when convert to string
  toString() {
    return this.name
  }

}

export function type(pattern) {
  const type = new Type(pattern)
  return type
}

export default Type
