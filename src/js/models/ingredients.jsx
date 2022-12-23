/**
 *   This file creates and exports an ingredient node. It creates an instance of the basic node, adds some configuration, and attaches a backbone model for the properties to it.
 */

let joint = require('jointjs/dist/joint.js');
let Backbone = require('backbone');

import { nodeTypes, IngredientCollection } from './index.jsx';

// This class represents an ingredients node. It creates an instance of the basic node and adds some configuration to it.
export class IngredientsNode {
    constructor(position) {
        // Set the properties of the node
        this.node = new joint.shapes.custom.Node({
            properties : new IngredientsProperties()
        });
        this.node.get('properties').set('ingredients', new IngredientCollection());
        this.node.get('properties').set('customIngredients', new IngredientCollection());
        // Add the given position to the default position
        let newPosition = {
            x: this.node.position().x + position.x,
            y: this.node.position().y + position.y
        };
        this.node.position(newPosition.x, newPosition.y);
        this.node.addDefaultPort('out');

        return this.node;
    };
}

// The properties for an ingredients node
let IngredientsProperties = Backbone.Model.extend({
    defaults: {
        type: nodeTypes.INGREDIENTS,
        // font-awesome icon
        icon: 'leaf',
        // optional additional css class for the node content
        cssClasses: 'ingredients',
        customIngredientFiles: [],
        customIngredients : undefined,
        ingredients: undefined // instance of IngredientsCollection
    },
    clone: function() {
        let propertiesClone = Backbone.Model.prototype.clone.apply(this, arguments);
        let ingredients = propertiesClone.get('ingredients');
        if (ingredients) {
            let ingredientsClone = ingredients.clone();
            propertiesClone.set('ingredients', ingredientsClone);
        }
        return propertiesClone;
    }
});
