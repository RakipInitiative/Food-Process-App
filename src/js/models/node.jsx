/**
 *   This file declares the basic node. The node extends a basic rect, adds some configuration, defines default values and overwrites some methods. Furthermore the file contains a declaration for a custom node view to add html elements to the node.
 */
let joint = require('jointjs/dist/joint.js');
let _ = require('lodash');
let Backbone = require('backbone');

import { ParameterCollection, ParameterModel, IngredientCollection, IngredientModel, EndProductCollection, EndProductModel, SubWorkFlow, SubWorkFlowCollection } from './index.jsx';

// Possible types of nodes
export const nodeTypes = {
    FOOD_PROCESS: 0,
    INGREDIENTS: 1,
    END_NODE: 2,
    META_NODE: 3
};

// Some configuration for the nodes
export let nodeConfig = {
    bodyWidth: 60,
    bodyHeight: 60,
    portSize: 12,
    labelOffset: -15,
    spacing: 10
};
nodeConfig.totalWidth = nodeConfig.bodyWidth + nodeConfig.portSize;
nodeConfig.totalHeight = nodeConfig.bodyHeight - nodeConfig.labelOffset;

// Configuration for the ports of a node
let basicPortGroup = {
    attrs: {
        rect: {
            width: nodeConfig.portSize,
            height: nodeConfig.portSize,
            magnet: 'active',
            'shape-rendering': 'crispEdges'
        }
    },
    position: {
        args: {
            dx: -(nodeConfig.portSize/2),
            dy: -(nodeConfig.portSize/2),
        }
    }
};
let rightPortGroup = _.cloneDeep(basicPortGroup);
rightPortGroup.position.name = 'right';

// Basic node object
joint.shapes.custom = {};
joint.shapes.custom.Node = joint.shapes.basic.Rect.extend({

    markup: `<g class="rotatable"><g class="scalable"><rect class="node-body"/></g><text class="label"/></g>`,
    portMarkup: `<rect class="node-port"/>`,

    defaults: _.defaultsDeep({
        type: 'custom.Node',
        size: {
            width: nodeConfig.bodyWidth,
            height: nodeConfig.bodyHeight
        },
        position: {
            x: nodeConfig.portSize/2,
            y: 0
        },
        attrs: {
            '.label': {
                text: '',
                'ref-y': nodeConfig.labelOffset,
                position: 'outside'
            },
            '.node-body': {
                'ref-width': '100%',
                'ref-height': '100%'
            }
        },
        ports: {
            groups: {
                inPorts: basicPortGroup,
                outPorts: rightPortGroup
            }
        },
        properties: {}
    }, joint.shapes.devs.Model.prototype.defaults),
    // Overwrite the initialize function to convert the properties and parameters of a loaded workflow to Backbone models
    initialize: function() {
        joint.shapes.basic.Rect.prototype.initialize.apply(this, arguments);
        let properties = this.get('properties');
        if (properties instanceof Backbone.Model) {
            return;
        }
        properties = new Backbone.Model(this.get('properties'));
        switch(properties.get('type')) {
            case nodeTypes.FOOD_PROCESS:
                let parameters = new ParameterCollection();
                for (let paramModel of properties.get('parameters')) {
                    parameters.add(new ParameterModel(paramModel));
                }
                properties.set('parameters', parameters);
                break;
            case nodeTypes.INGREDIENTS:
                let ingredients = new IngredientCollection();
                for (let ingredientModel of properties.get('ingredients')) {
                    ingredients.add(new IngredientModel(ingredientModel));
                }
                properties.set('ingredients', ingredients);
                break;
            case nodeTypes.END_NODE:
                let endProducts = new EndProductCollection();
                for (let endProduct of properties.get('endProducts')) {
                    endProducts.add(new EndProductModel(endProduct));
                }
                properties.set('endProducts', endProducts);
                break;
            case nodeTypes.META_NODE:
                let metanodeData = new SubWorkFlowCollection();
                for (let data of properties.get('metanodeData')) {
                    metanodeData.add(new SubWorkFlow(data));
                }
                properties.set('metanodeData', metanodeData);
                break;
        }
        this.set('properties', properties);
    },

    // Add an input or output port to the node
    // Use type 'in' for input and 'out' for output
    addDefaultPort(type) {
        let portsOfType = _.filter(this.getPorts(), {group: type + 'Ports'});
        // Maximal number of ports reached
        if (portsOfType.length >= 4) {
            return;
        }
        this.addPort({
            id: type + (portsOfType.length + 1),
            group: type + 'Ports'
        });
    },
    // Remove the last added input or output port from the node
    // Use type 'in' for input and 'out' for output
    removeDefaultPort(type) {
        let portsOfType = _.filter(this.getPorts(), {group: type + 'Ports'});
        const nodeType = this.get('properties').get('type');

        // Minimal number of ports reached
        if (type === 'out' && portsOfType.length <= 0) {
            return;
        } else if (type === 'in') {
            
            // don't allow to delete input ports except when there is a metanode
            if(portsOfType.length <= 1 && nodeTypes.META_NODE !== nodeType) {
                return;
            }

            if(portsOfType.length <= 0 && nodeTypes.META_NODE === nodeType) {
                return;
            }
        }
        this.removePort(portsOfType[portsOfType.length - 1]);
    },
    setName: function(name) {
        this.attr({
            '.label': {
                text: name
            }
        });
    },
    setLabelOffset: function(labelOffset) {
        this.attr({
            '.label': {
                'ref-y': labelOffset,
            }
        });
    },
    // Overwrite the toJSON method to convert the custom properties to json too
    toJSON: function() {
        let propertiesJSON = this.get('properties').toJSON();
        let jsonNode = joint.shapes.basic.Rect.prototype.toJSON.apply(this, arguments);
        jsonNode.properties = propertiesJSON;
        return jsonNode;
    },
    clone: function() {
        let nodeClone =  joint.shapes.basic.Rect.prototype.clone.apply(this, arguments);
        // Clone the properties and parameters separately to generate a unique id (applies for all nested models)
        let propertiesClone = nodeClone.get('properties').clone();
        nodeClone.set({
            properties: propertiesClone
        });
        return nodeClone;
    }
});

// The NodeView creates a HTML element wich follows the node and displays the node icon.
joint.shapes.custom.NodeView = joint.dia.ElementView.extend({
    init: function() {
        joint.dia.ElementView.prototype.init.apply(this, arguments);
        let icon = '';
        let cssClasses = '';
        let properties = this.model.get('properties');
        if (properties instanceof Backbone.Model) {
            icon = properties.get('icon');
            cssClasses = properties.get('cssClasses') || '';
        } else {
            icon = properties.icon;
            cssClasses = properties.cssClasses || '';
        }
        this.template = this.createTemplate(icon, cssClasses);

        // Update the box position whenever the underlying model changes.
        this.listenTo(this.model, 'change', this.updateBox);
    },

    createTemplate: function(icon, cssClasses) {
        return '<div class="node-content ' + cssClasses + '"><i class="fa fa-' + icon + ' fa-2x" aria-hidden="true"></i></div>';
    },

    onRender: function() {
        if (this.$box) this.$box.remove();

        let boxMarkup = joint.util.template(this.template)();
        let $box = this.$box = $(boxMarkup);

        // Update the box size and position whenever the paper transformation changes.
        this.listenTo(this.paper, 'scale translate', this.updateBox);

        $box.appendTo(this.paper.el);
        this.updateBox();

        return this;
    },

    updateBox: function() {
        // Set the position and the size of the box so that it covers the JointJS element
        // (taking the paper transformations into account).
        let bbox = this.getBBox({ useModelGeometry: true });
        let scale = joint.V(this.paper.viewport).scale();

        this.$box.css({
            transform: 'scale(' + scale.sx + ',' + scale.sy + ')',
            transformOrigin: '0 0',
            width: bbox.width / scale.sx,
            height: bbox.height / scale.sy,
            left: bbox.x,
            top: bbox.y
        });
    },

    onRemove: function(evt) {
        this.$box.remove();
    }

});

