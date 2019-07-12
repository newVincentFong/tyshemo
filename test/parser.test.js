import Parser from '../src/parser.js'

describe('Parser', () => {
  test('parse', () => {
    const def = {
      __def__: [
        {
          name: 'book',
          def: { name: 'string', price: 'float' },
        },
      ],
      name: 'string',
      age: 'number',
      has_football: '?boolean', // ifexist
      sex: 'F|M',
      dot: '=xxxxx', // equal
      belong: '?=animal', // ifexist equal
      vioce: '!number', // should not match
      num: 'string,numeric', // match multiple
      parents: ['string', 'string'], // tuple
      books: 'book[]', // list, use defined 'book'
      body: {
        head: 'boolean',
        neck: 'boolean',
      },
    }
    const type = new Parser().parse(def)
    const target = {
      name: 'tomy',
      age: 10,
      // has_football: true,
      sex: 'F',
      dot: 'xxxxx',
      belong: 'animal',
      vioce: '123',
      num: '123',
      parents: ['Jhon', 'Lucy'],
      books: [
        { name: '3 ben', price: 10.2 },
      ],
      body: {
        head: true,
        neck: true,
      },
    }

    expect(() => type.assert(target)).not.toThrowError()
  })
})
