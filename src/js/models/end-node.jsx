/**
 *   This file creates and exports an end-node node. It creates an instance of the basic node, adds some configuration, and attaches a backbone model for the properties to it.
 */

 let joint = require('jointjs/dist/joint.js');
 let Backbone = require('backbone');
 
 import { nodeTypes, EndProductCollection } from './index.jsx';
 
 // This class represents an ingredients node. It creates an instance of the basic node and adds some configuration to it.
export class EndNode {
    constructor(position) {
        // Set the properties of the node
        this.node = new joint.shapes.custom.Node({
            properties: new EndNodeProperties()
        });
        this.node.get('properties').set('endProducts', new EndProductCollection());
        // Add the given position to the default position
        let newPosition = {
            x: this.node.position().x + position.x,
            y: this.node.position().y + position.y
        };
        this.node.position(newPosition.x, newPosition.y);
        // add default port in
        this.node.addDefaultPort('in');
        return this.node;
    };
}
 
 // The properties for an ingredients node
let EndNodeProperties = Backbone.Model.extend({
    defaults: {
        type: nodeTypes.END_NODE,
        // font-awesome icon
        icon: 'box',
        // optional additional css class for the node content
        cssClasses: 'end-product',
        endProducts: undefined // instance of EndProductCollection
    },
    clone: function() {
        let propertiesClone = Backbone.Model.prototype.clone.apply(this, arguments);
        let endProducts = propertiesClone.get('endProducts');
        if (endProducts) {
            let endProductsClone = endProducts.clone();
            propertiesClone.set('endProducts', endProductsClone);
        }
        return propertiesClone;
    }
});
 