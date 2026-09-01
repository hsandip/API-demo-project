import { describe, expect, it } from 'vitest'
import { nullifyUndefined } from './users'

describe('nullifyUndefined', () => {
  it('leaves defined values untouched', () => {
    expect(nullifyUndefined({ firstName: 'Emily', age: 28 })).toEqual({
      firstName: 'Emily',
      age: 28,
    })
  })

  it('converts undefined values to null so JSON.stringify keeps the key', () => {
    const input = { age: undefined, gender: undefined, firstName: 'Emily' }
    const result = nullifyUndefined(input)
    expect(result).toEqual({ age: null, gender: null, firstName: 'Emily' })
    // The actual bug this guards against: JSON.stringify drops undefined
    // keys entirely, so a PATCH meant to clear a field would silently omit
    // it instead. Confirm the serialized form keeps the key.
    expect(JSON.stringify(result)).toContain('"age":null')
  })
})
