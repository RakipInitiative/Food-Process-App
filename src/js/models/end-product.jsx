/**
 *   This file declares and exports a model and collection for the end-product.
 */

let Backbone = require('backbone');

import { CustomCollection } from './collection.jsx';
 
export let EndProductModel = Backbone.Model.extend({
     defaults: {
         name: "",
     }
 });
 
 export let EndProductCollection = CustomCollection.extend({
     model: EndProductModel
 });