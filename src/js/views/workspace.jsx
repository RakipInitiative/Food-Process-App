/**
 *   This file declares and exports the view for the workspace. It creates a joint paper and adds some configuration. It furthermore handles all mouse events for node selection, scrolling and zooming.
 */

let joint = require('jointjs/dist/joint.js');
let Backbone = require('backbone');

import { nodeTypes } from '../models/index.jsx';

export let WorkspaceView = Backbone.View.extend({
    activeNodeView: null,
    initialize: function(workspaceGraph, propertiesView) {
        this.workspaceGraph = workspaceGraph;
        this.propertiesView = propertiesView;
    },
    render: function() {
        let workspaceGraph = this.workspaceGraph;
        let propertiesView = this.propertiesView;
        this.workspace = new joint.dia.Paper({
            el: this.$el,
            width: '100%',
            height: '100%',
            model: workspaceGraph,
            cellViewNamespace: joint.shapes,
            defaultLink: new joint.dia.Link({
                router: {
                    name: 'metro'
                },
                connector: {
                    name: 'rounded'
                },
                attrs: { '.connection':
                    {
                        'stroke-width': 2 
                    }
                },
            }),
            drawGrid: true,
            gridSize: 15,
            // Remove links without target
            linkPinning: false,
            // An element may not have more than one link with the same source and target element
            multiLinks: false,
            // Enable link snapping
            snapLinks: {
                radius: 15
            },
            validateConnection: function(cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
                // Prevent linking from input ports to input ports.
                if (magnetS && magnetS.getAttribute('port-group') === 'inPorts' && magnetT && magnetT.getAttribute('port-group') === 'inPorts') {
                    return false;
                }
                // Prevent linking from output ports to output ports.
                if (magnetS && magnetS.getAttribute('port-group') === 'outPorts' && magnetT && magnetT.getAttribute('port-group') === 'outPorts') {
                    return false;
                }
                // Prevent linking to any element other than ports
                if (!magnetT || !magnetT.getAttribute('port-group')) {
                    return false;
                }
                // Prevent linking from output ports to input ports within one element.
                return cellViewS !== cellViewT;
            },
            interactive: function(cellView) {
                if (cellView.model instanceof joint.dia.Link) {
                    // Disable the default vertex add functionality on pointerdown.
                    return { vertexAdd: false };
                }
                return true;
            }
        });

        let self = this;
        let pointerdown = false;
        let performanceTimeout = false;
        // Paper drag start position
        let dragStartPosition = {};
        // Paper origin on drag start
        let dragStartOrigin = {};

        // Listen for clicks on a node
        this.workspace.on('cell:pointerdown', function(nodeView) {
            // Remove the focus of the element that is currently in focus
            $($(':focus')[0]).blur();
            // Check if cell a node
            if (nodeView.model instanceof joint.shapes.custom.Node) {
                // Deselect currently selected node
                self.activeNodeView && self.activeNodeView.$el.find('.node-body').removeClass('active');
                // set the custom ingredients files to this node
                if(nodeTypes.INGREDIENTS === nodeView.model.get('properties').get('type')) {
                    const metadaModel = self.workspaceGraph.get('settings');
                    nodeView.model.get('properties').set('customIngredientFiles', metadaModel.get('customIngredients'));
                }
                // Set node element to active
                nodeView.$el.find('.node-body').addClass('active');
                // Update the model of the properties view to the model of the selected node
                propertiesView.setCurrentNode(nodeView);
                self.activeNodeView = nodeView;
            }
        });
        // Listen for clicks on the paper
        this.workspace.on('blank:pointerdown', function(event) {
            pointerdown = true;
            dragStartPosition = {
                x: event.pageX,
                y: event.pageY
            };
            dragStartOrigin = {
                x: self.workspace.options.origin.x,
                y: self.workspace.options.origin.y
            };

            // Remove the focus of the element that is currently in focus
            $($(':focus')[0]).blur();
            // Deselect currently selected node
            if (self.activeNodeView) {
                self.activeNodeView.$el.find('.node-body').removeClass('active');
                self.activeNodeView = null;
                propertiesView.setCurrentNode(null);
            }
        });

        this.workspace.on('blank:pointerup', function() {
            pointerdown = false;
            
            if (self.activeNodeView) {
                self.activeNodeView.$el.find('.node-body').removeClass('active');
                self.activeNodeView = null;
                propertiesView.setCurrentNode(null);
            }
        });
        

        // Listen for pointer move events for paper dragging
        $(window).on('mousemove touchmove', function(event) {
            if (!pointerdown || performanceTimeout) {
                return;
            }
            performanceTimeout = true;
            setTimeout(function() {
                performanceTimeout = false;
            }, 20);

            let mousePosition = {
                x: event.pageX,
                y: event.pageY
            };
            if (event.type === 'touchmove') {
                mousePosition.x = event.originalEvent.touches[0].pageX;
                mousePosition.y = event.originalEvent.touches[0].pageY;
            }
            let newOrigin = {
                x: dragStartOrigin.x + (mousePosition.x - dragStartPosition.x),
                y: dragStartOrigin.y + (mousePosition.y - dragStartPosition.y)
            };
            newOrigin.x > 0 && (newOrigin.x = 0);
            newOrigin.y > 0 && (newOrigin.y = 0);
            self.workspace.setOrigin(newOrigin.x, newOrigin.y);
        });

        let zoomLevel = 1;
        this.$el.on('mousewheel', function(event) {
            if (event.originalEvent.wheelDelta > 0) {
                // zoom in
                zoomLevel = Math.min(3, zoomLevel + 0.1);
            } else {
                // zoom out
                zoomLevel = Math.max(0.2, zoomLevel - 0.1);
            }
            self.workspace.scale(zoomLevel, zoomLevel); //, 0, 0);
        });
    },
    getWorkspace: function() {
        return this.workspace;
    },
    resetNodeFocus : function () {
        console.log('fsfsdf')
        this.activeNodeView.$el.find('.node-body').removeClass('active');
        this.activeNodeView = null;
        this.propertiesView.setCurrentNode(null);
    }
});