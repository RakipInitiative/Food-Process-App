/**
 *   This file declares and exports a model and collection for ingredients. The collection can be used to contain all ingredients of a ingredients-node.
 */

let Backbone = require('backbone');

import { CustomCollection } from './collection.jsx';

export let IngredientModel = Backbone.Model.extend({
    defaults: {
        id: undefined,
        value: "",
        amount: 0,
        unit: "g",
        name: ""
    }
});

export let IngredientCollection = CustomCollection.extend({
    model: IngredientModel
});