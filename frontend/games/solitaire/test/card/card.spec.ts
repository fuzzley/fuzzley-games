import 'jasmine';

import {Card} from '../../src/card/card';

describe('Card', () => {
    it('can be created', () => {
        expect({faceUp: true} as Card).toBeDefined();
    });
});