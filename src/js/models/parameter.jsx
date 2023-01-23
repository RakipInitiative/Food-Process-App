/**
 *   This file declares and exports a model and collection for parameters. The collection can be used to contain all parameters of a food-process-node.
 */

let Backbone = require('backbone');

import { CustomCollection } from './collection.jsx';

export let ParameterModel = Backbone.Model.extend({
    defaults: {
        id: undefined,
        name: "",
        unit: "",
        timeValues: [],
        optional: true
    }
});

export let ParameterCollection = CustomCollection.extend({
    model: ParameterModel
});