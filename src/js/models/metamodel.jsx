/**
 *   This file declares and exports a model and collection for the metanode.
 */

 let Backbone = require('backbone');

 import { CustomCollection } from './collection.jsx';
  
 export let SubWorkFlow = Backbone.Model.extend({
      defaults: {
          name: "",
          file: {
            id:"",
            filename: "",
            data: null
          }
      }
  });
  
  export let SubWorkFlowCollection = CustomCollection.extend({
      model: SubWorkFlow
  });