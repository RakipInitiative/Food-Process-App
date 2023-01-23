/**
 *   This file creates and exports a metanode node. It creates an instance of the basic node, adds some configuration, and attaches a backbone model for the properties to it.
 */

 let joint = require('jointjs/dist/joint.js');
 let Backbone = require('backbone');
 
 import { nodeTypes, SubWorkFlowCollection } from './index.jsx';
 
 // This class represents an ingredients node. It creates an instance of the basic node and adds some configuration to it.
export class MetaNode {
    constructor(position) {
        // Set the properties of the node
        this.node = new joint.shapes.custom.Node({
            properties: new MetaNodeProperties()
        });
        this.node.get('properties').set('metanodeData', new SubWorkFlowCollection());
        // Add the given position to the default position
        let newPosition = {
            x: this.node.position().x + position.x,
            y: this.node.position().y + position.y
        };
        this.node.position(newPosition.x, newPosition.y);
        // add default port in
        this.node.addDefaultPort('in');
        this.node.addDefaultPort('out');
        return this.node;
    };
}

 // The properties for an ingredients node
 let MetaNodeProperties = Backbone.Model.extend({
    defaults: {
        type: nodeTypes.META_NODE,
        // font-awesome icon
        icon: 'arrow-right',
        // optional additional css class for the node content
        cssClasses: 'subworkflow',
        metanodeData: undefined // instance of SubworkflowCollection
    },
    clone: function() {
        let propertiesClone = Backbone.Model.prototype.clone.apply(this, arguments);
        let metanodeData = propertiesClone.get('metanodeData');
        if (metanodeData) {
            let metanodeDataClone = metanodeData.clone();
            propertiesClone.set('metanodeData', metanodeDataClone);
        }
        return propertiesClone;
    }
});