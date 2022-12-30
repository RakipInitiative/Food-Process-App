/**
 *   This file declares and exports the view for the menu. The declaration contains all data bindings and events for the view. It implements the behavior for the drag and drop node library and the import, export and send functionality. Furthermore it renders the settings view.
 */

let $ = require('jquery');
let joint = require('jointjs/dist/joint.js');
let Backbone = require('backbone');
let _ = require('lodash');
let moment = require('moment');
let platform = require('platform');

let menuTemplate = require('../../templates/menu.html');

import { FoodProcessNode, IngredientsNode, nodeConfig, MetadataModel, EndNode, MetaNode, nodeTypes}  from '../models/index.jsx';
import { SettingsView, CustomSettingsAreaView } from './index.jsx';

let configJSON = require('../../../config.json');

export let MenuView = Backbone.View.extend({
    template: _.template(menuTemplate),
    // Render the nodes library in the element with the given selector
    nodesLibraryElementId: 'nodes-library',
    // Bind the content of the input fields to the model
    bindings: {
        '#workflowNameInput': 'workflowName',
        '#authorInput': 'author',
    },
    // Bind events to appropriate functions
    events: {
        'click #sendToAPIButton': 'sendToAPIOpened',
        'click #saveButton': 'saveModel',
        'change #uploadInput': 'loadModel'
    },
    // The model for all metadata
    model: new MetadataModel(),
    initialize: function(workspaceGraph, workspaceElement, workspace) {
        this.workspaceGraph = workspaceGraph;
        this.workspaceElement = workspaceElement;
        this.workspace = workspace;
        this.config = configJSON;

        let self = this;
        $(window).on('beforeunload', function() {
            if (self.unsavedChanged()) {
                return "The model contains unsaved changes that will be lost. Continue anyway?";
            }
        });
    },
    render: function() {
        this.workspaceGraph.set('settings', this.model);
        this.workspaceGraph.set('menu', this);
        this.$el.html(this.template({model: this.model, url: this.config.defaultAPIUrl}));
        this.renderNodesLibrary();
        this.reloadMainWorkflow();
        this.saveSubworkFlowListener();
        this.toggleButtonReload();
        this.stickit();
        this.$el.foundation();

        // Render the settings modal
        this.settings = new SettingsView(this.model, this.workspaceGraph, this.$el.find('#workflowNameInput'), this.$el.find('#authorInput'));
        this.settings.setElement(this.$('#settings'));
        this.settings.render();

        if(this.model != null) {
            let self = this;
            let nodeId = self.model.cid;
            // create ingredient tree widget modal
            let customSettingsAreaModal = new CustomSettingsAreaView(self.model, nodeId);
            customSettingsAreaModal.setElement(self.$('#customSettingsArea' + nodeId));
            customSettingsAreaModal.render();                    
        }
    },
    toggleButtonReload : function() {
        let self = this;
        // if mainworkflow does not exist then hide the button area
        if(!localStorage.getItem('mainWorkflow')) {
            self.$el.find('.reloadWorkflowArea').hide();
        } else {
            self.$el.find('.reloadWorkflowArea').show();
        }
    },
    reloadMainWorkflow: function() {
        let self = this;
        self.$el.find('#reloadWorkflow').on('click', function() {
            if(localStorage.getItem('mainWorkflow')) {
               let workflowJsonData = localStorage.getItem('mainWorkflow');
               let dataFromJSON = JSON.parse(workflowJsonData);
               self.workspaceGraph.fromJSON(dataFromJSON);
               self.model = new MetadataModel(dataFromJSON.settings);
               self.model.set('isMain', true);
               self.model.set('currentFileId', '');
               // remove old mainworkflow
                if(localStorage.getItem('mainWorkflow')) {
                    localStorage.removeItem('mainWorkflow');
                }
               self.render();
            }
        });
    },
    saveSubworkFlowListener: function() {
        let self = this;
        const dataBase64Prefix = 'data:application/json;base64,';

        self.$el.find('#saveWorkFlowProgress').on('click', function() {
            let exportJSON = self.workspaceGraph.toJSON();
            const stringifiedWorkspace = JSON.stringify(exportJSON, (key, value)=>{
                if(key !== 'menu') {
                    return value;
                }
            });

            const workspaceInBase64 = btoa(stringifiedWorkspace);
            const fileData = dataBase64Prefix + workspaceInBase64;
            // get main workflow
            const mainWorkflow = localStorage.getItem('mainWorkflow');
            // convert it to json
            const mainWorkflowJSON = JSON.parse(mainWorkflow);
            // loop through cells to find the metanode
            for(const cell of mainWorkflowJSON['cells']) {
                if(nodeTypes.META_NODE === cell['properties']['type']) {
                    // retrieve file id from the metanodeData
                    const metaNodeFileId = cell['properties']['metanodeData'][0]['file']['id'];
                    if(self.model.get('currentFileId') === metaNodeFileId) {
                        // set  the data
                        cell['properties']['metanodeData'][0]['file']['data'] = fileData;
                        break;
                    }
                }
            }
            // replace current main workflow in the local storage
            localStorage.setItem('mainWorkflow', JSON.stringify(mainWorkflowJSON));
        });
    },
    renderNodesLibrary: function() {
        // Create a graph to hold the nodes of the library
        let nodesLibraryGraph = new joint.dia.Graph({}, {cellNamespace: joint.shapes});
        // Create a paper to display the nodes of the library
        let nodesLibraryPaper = new joint.dia.Paper({
            el: this.$('#' + this.nodesLibraryElementId),
            // The size of the paper is equal with the size of a node
            width: nodeConfig.totalWidth * 2 + nodeConfig.spacing + 'px',
            height: nodeConfig.totalHeight * 4 + 'px',
            model: nodesLibraryGraph,
            cellViewNamespace: joint.shapes,
            // Configure the library to be not interactive, so the nodes can't be moved
            interactive: false,
        });
        // Add the library nodes
        nodesLibraryGraph.addCells(this.createMenuNodes());
        
        // Listen for drag events to enable drag and drop of the nodes of the library
        this.addDragAndDropListener(nodesLibraryPaper);
    },
    // Create the nodes for the library
    createMenuNodes: function() {
        let nodes = [];
        nodes.push(new FoodProcessNode({ x: 0, y: 1}, 1, 1));
        nodes.push(new FoodProcessNode({ x: nodeConfig.totalWidth + nodeConfig.spacing, y: 1}, 2, 1));
        nodes.push(new FoodProcessNode({ x: 0, y: nodeConfig.totalHeight + 1}, 1, 2));
        nodes.push(new FoodProcessNode({ x: nodeConfig.totalWidth + nodeConfig.spacing, y: nodeConfig.totalHeight + 1}, 1, 0));
        nodes.push(new IngredientsNode({ x: 0, y: nodeConfig.totalHeight * 2 + 1}));
        nodes.push(new EndNode({ x: nodeConfig.totalWidth + nodeConfig.spacing, y: nodeConfig.totalHeight * 2 + 1}));
        nodes.push(new MetaNode({ x: 0, y: nodeConfig.totalHeight * 3 + 1}));
        return nodes;
    },
    addDragAndDropListener: function(nodesLibraryPaper) {
        // Create a reference of the workspace object for later
        let workspaceGraph = this.workspaceGraph;
        let workspaceElement = this.workspaceElement;
        let workspace = this.workspace;

        // Listen for the "pointerdown" event on a node of the library
        nodesLibraryPaper.on('cell:pointerdown', function(nodeView, event, x, y) {
            let rootElement = $('body');
            // Add a DOM element to hold the node that is dragged
            rootElement.append('<div id="flyingNode" class="flyingNode"></div>');
            let flyingNodeElement = $('#flyingNode');
            // Create new graph and paper for the dragged node
            let flyingNodeGraph = new joint.dia.Graph({}, {cellNamespace: joint.shapes});
            new joint.dia.Paper({ // needs to be initialized
                el: flyingNodeElement,
                model: flyingNodeGraph,
                width: nodeConfig.totalWidth + 'px',
                height: nodeConfig.totalHeight + 'px',
                cellViewNamespace: joint.shapes,
                interactive: false
            });

            // Copy the dragged node of the library
            let flyingNodeShape = nodeView.model.clone();
            let position = nodeView.model.position();
            let offset = {
                x: x - position.x,
                y: y - position.y
            };

            flyingNodeShape.position(nodeConfig.portSize/2, 0);
            // Add the copy of the node to the new graph
            flyingNodeGraph.addCell(flyingNodeShape);

            // Move the flying node with the movement of the mouse
            rootElement.on('mousemove.fly touchmove.fly', function(event) {
                let posX = event.pageX;
                let posY = event.pageY;
                if (event.type === 'touchmove') {
                    posX = event.originalEvent.touches[0].pageX;
                    posY = event.originalEvent.touches[0].pageY;
                }
                flyingNodeElement.offset({
                    left: posX - offset.x - nodeConfig.portSize/2,
                    top: posY - offset.y
                });
            });
            // Listen for the drop
            rootElement.on('mouseup.fly touchend.fly', function(event) {
                let posX = event.pageX;
                let posY = event.pageY;
                if (event.type === 'touchend') {
                    posX = event.originalEvent.changedTouches[0].pageX;
                    posY = event.originalEvent.changedTouches[0].pageY;
                }
                let target = workspaceElement.offset();

                // Dropped over paper ?
                if (posX > target.left && posX < target.left + workspaceElement.width() && posY > target.top && posY < target.top + workspaceElement.height()) {
                    let newNode = flyingNodeShape.clone();
                    let currentWorkspaceScale = joint.V(workspace.viewport).scale();
                    let currentWorkspaceOrigin = workspace.options.origin;
                    let newPosition = {
                        x: (posX - target.left - offset.x - currentWorkspaceOrigin.x) / currentWorkspaceScale.sx,
                        y: (posY - target.top - offset.y - currentWorkspaceOrigin.y) / currentWorkspaceScale.sy
                    };
                    newNode.position(newPosition.x, newPosition.y);
                    // Add the node to the main workspace
                    workspaceGraph.addCell(newNode);
                }
                // cleanup
                rootElement.off('mousemove.fly touchmove.fly').off('mouseup.fly touchend.fly');
                flyingNodeShape.remove();
                flyingNodeElement.remove();
            });
        });
    },
    sendToAPIOpened: function() {
        if (this.sendToAPIInitialized) {
            return;
        }
        let self = this;
        $('#sendToAPISendButton').on('click', function() {
            self.sendToAPI($('#sendToAPIURL').val());
        });
        this.sendToAPIInitialized = true;
    },
    sendToAPI: function(url) {
        // create stringified data
        const data  = JSON.stringify(this.workspaceGraph.toJSON(), (key, value)=>{
            if(key !== 'menu') {
                return value;
            }
        })

        $.ajax({
            type: "POST",
            url: url,
            dataType: 'json',
            data: data,
            success: function (response) {
                console.log("Success: ", response);
            },
            error: function(response) {
                console.error("Error: ", response);
            }
        });
    },
    saveModel: function(event) {
        this.model.set('lastSaved', new Date());
        this.model.set('isMain', false);
        let exportJSON = this.workspaceGraph.toJSON();
        const stringified = JSON.stringify(exportJSON, (key, value)=>{
            if(key !== 'menu') {
                return value;
            }
        });

        let blob = new Blob([stringified], {type: "application/json"});
        let url  = URL.createObjectURL(blob);
        let fileName = (exportJSON.settings.get('workflowName') || 'workflow') + '.json';
        if (platform.name === "Microsoft Edge") {
            window.navigator.msSaveOrOpenBlob(blob, fileName);
            return;
        }
        $(event.target).attr('download', fileName);
        $(event.target).attr('href', url);
        // if there is an already saved main in the local storage do not load this as main
        if(!localStorage.getItem('mainWorkflow')) {
            this.model.set('isMain', true);
        }
    },
    loadModel: function(event) {
        if (!this.unsavedChanged() || confirm('The model contains unsaved changes that will be lost. Continue anyway?')) {
            let files = event.target.files;
            if (!files || !files.length) {
                return;
            }
            let fileReader = new FileReader();
            let self = this;
            fileReader.onload = function(event) {
                let dataFromJSON = JSON.parse(event.target.result);
                self.workspaceGraph.fromJSON(dataFromJSON);
                self.model = new MetadataModel(dataFromJSON.settings);
                // if there is an already saved main in the local storage do not load this as main
                if(!localStorage.getItem('mainWorkflow')) {
                    self.model.set('isMain', true);
                }
                self.render();
            };
            fileReader.readAsText(files.item(0));
        } else {
            event.target.value = "";
        }
    },
    unsavedChanged: function() {
        let lastChanged = moment(this.model.get('lastChanged')).unix();
        let lastSaved = moment(this.model.get('lastSaved')).unix() || null;
        let created = moment(this.model.get('created')).unix();
        return (!lastSaved || lastChanged > lastSaved) && lastChanged !== created;
    },
    setMetadataModelAndRerender: function(metadataModel) {
        this.model = metadataModel;
        this.render();
        this.workspace.trigger('blank:pointerup');
    }
});