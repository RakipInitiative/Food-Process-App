/**
 *   This file declares and exports the view for the properties. The declaration contains all data bindings and events for the view. It contains implementations of properties for both, ingredient- and food-process-nodes.
 */

require('backbone.modelbinder');

let Backbone = require('backbone');
let _ = require('lodash');
let $ = require('jquery');
let randomstring = require("randomstring");
require('jstree');

let foodProcessPropertiesTemplate = require('../../templates/food-process-properties.html');
let ingredientsPropertiesTemplate = require('../../templates/ingredients-properties.html');
let endProductTemplate = require('../../templates/end-product.html');
let subworkflowTemplate = require('../../templates/subworkflow.html');
let emptyPropertiesTemplate = require('../../templates/empty-properties.html');

import {nodeTypes, ParameterModel, IngredientModel, SubWorkFlow, MetadataModel} from '../models/index.jsx';
import {TimetableView, IngredientTreeWidgetView} from './index.jsx'

let ingredientsCV = require('../../cv/ingredients.csv');
let processNamesCV = require('../../cv/processes.csv');
let parameterNamesCV = require('../../cv/parameters.csv');
let unitsCV = require('../../cv/units.csv');
let foodOnIngredientJSON = require('../../json/foodex.json')

export let PropertiesView = Backbone.View.extend({
    ingredients: [],
    foodProcessTemplate: _.template(foodProcessPropertiesTemplate),
    ingredientsTemplate: _.template(ingredientsPropertiesTemplate),
    endProductTemplate: _.template(endProductTemplate),
    subworkflowTemplate: _.template(subworkflowTemplate),
    emptyTemplate: _.template(emptyPropertiesTemplate),
    emptyModel: new Backbone.Model(),
    durationUnits: [{name:'sec'}, {name:'min'}, {name:'h'}, {name:'d'}],
    // Bind the content of the input fields to the model of the node
    bindings: {
        '#processNameSelect': {
            observe: 'processName',
            selectOptions: {
                collection: 'this.processNames',
                labelPath: 'name',
                valuePath: 'id',
                defaultOption: {
                    label: 'Choose one...',
                    value: null
                }
            }
        },
        '#durationInput': 'duration',
        '#durationUnitSelect': {
            observe: 'durationUnit',
            selectOptions: {
                collection: 'this.durationUnits',
                labelPath: 'name',
                valuePath: 'name'
            }
        }
    },
    // Bind events to appropriate functions
    events: {
        'click #deleteNodeButton': 'deleteCurrentNode',
        'click #addParameterButton': 'addParameter',
        'click #addInPortButton': 'addInPort',
        'click #addOutPortButton': 'addOutPort',
        'click #removeInPortButton': 'removeInPort',
        'click #removeOutPortButton': 'removeOutPort'
    },
    initialize: function(workspaceGraph) {
        this.model = this.emptyModel;
        this.workspaceGraph = workspaceGraph;
        this.ingredients = ingredientsCV.sort(this.compareByName);
        this.processNames = processNamesCV.sort(this.compareByName);
        this.allUnits = unitsCV.sort(this.compareByUnit);
        this.parameterNames = parameterNamesCV.sort(this.compareByName);
    },
    render: function() {
        this.unstickit();
        // Render the appropriate context menu for the selected node
        let template = this.emptyTemplate;
        
        switch(this.model.toJSON().type) {
            case nodeTypes.FOOD_PROCESS:
                // food node
                template = this.foodProcessTemplate;
                this.$el.html(template({
                    model: this.model,
                    allUnits: this.allUnits,
                    parameterNames: this.parameterNames
                }));

                // if food process, render food process specific elements
                if(this.model != this.emptyModel) {
                    // now that we have a model and parameters, we can add more bindings
                    this.addParameterBindings();

                    // Render the timetable modal
                    let parameters = this.model.get('parameters').models;
                    let self = this;
                    _.each(parameters, function (parameterModel) {
                        let nodeId = self.model.cid;
                        let timetableModalId = '#timetableModal' + nodeId + parameterModel.get('id');
                        // Only render if modal doesn't already exist
                        if ($(timetableModalId).length === 0) {
                            let timetableModal = new TimetableView(parameterModel, nodeId);
                            timetableModal.setElement(self.$('#timetable' + nodeId + parameterModel.get('id')));
                            timetableModal.render();
                        }
                    });
                }
                this.stickit();
                this.$el.foundation();
                this.initValidators();

                // Trigger workspace change event to update "lastChanged"
                this.model.get('parameters').on('change', function() {
                    self.workspaceGraph.trigger('change');
                });
                break;

            case nodeTypes.INGREDIENTS:
                // ingredient node
                template = this.ingredientsTemplate;
                const categorizedIngredients = this.generateCategorizedIngredients(this.ingredients);
                this.$el.html(template({
                    model: this.model,
                    ingredients: this.ingredients,
                    allUnits: this.allUnits
                }));
                
                // create ingredient tree widget
                if(this.model != this.emptyModel) {
                    let self = this;
                    let nodeId = self.model.cid;
                    // create ingredient tree widget modal
                    let ingredientTreeWidgetModal = new IngredientTreeWidgetView(self.model, nodeId);
                    // set element ingredients and metadata model for the modal
                    ingredientTreeWidgetModal.catagorizedIngredients = categorizedIngredients;
                    ingredientTreeWidgetModal.setElement(self.$('#ingredientTreeWidget' + nodeId));
                    ingredientTreeWidgetModal.render();                    
                }
                this.selectIngredientDropdownListener();
                this.addAmountAndUnitListener();
                this.stickit();
                this.$el.foundation();

                // Trigger workspace change event to update "lastChanged"
                this.model.get('ingredients').on('change', function() {
                    self.workspaceGraph.trigger('change');
                });
                break;
            
            case nodeTypes.END_NODE:
                // end node
                template = this.endProductTemplate;
                this.$el.html(template({
                    model: this.model,
                    workspace: this.workspaceGraph
                }));
                this.addEndProductBinding();
                this.stickit();
                this.$el.foundation();

                // Trigger workspace change event to update "lastChanged"
                this.model.get('endProducts').on('change', function() {
                    self.workspaceGraph.trigger('change');
                });
                
                break;

            case nodeTypes.META_NODE:
                // meta node
                template = this.subworkflowTemplate;
                let metanodeData = this.model.get('metanodeData').models;
                // push a default metanode model
                if(metanodeData.length === 0) {
                    metanodeData.push(new SubWorkFlow({
                        name: '', 
                        file: {
                            id: '',
                            filename: '',
                            data: null
                        }
                    }))
                }

                this.$el.html(template({
                    model: this.model
                }));
                this.addWorkFlowBinding();
                this.addUploadWorflowFromJSONListener();
                this.toggleFileDownloadArea();
                this.addDownloadFileListener();
                this.loadSubWorkflowFileListener();
                this.removeOldWorkflowFile();
                this.stickit();
                this.$el.foundation();

                // Trigger workspace change event to update "lastChanged"
                this.model.get('metanodeData').on('change', function() {
                    self.workspaceGraph.trigger('change');
                });
                
                break;
            
            default:
                this.$el.html(template);
                break;
        }

        // Trigger workspace change event to update "lastChanged"
        let self = this;
        this.model.on('change', function() {
            self.workspaceGraph.trigger('change');
        });
    },
    // Set the selected node and rerender the menu
    setCurrentNode: function(nodeView) {
        if (!nodeView) {
            this.model = this.emptyModel;
            this.currentNode = null;
        } else {
            // Unregister change listener from current node
            this.model && this.model.off('change:processName');

            // unregister change listener from current ingredients node
            if(this.model.get('ingredients')){
                this.model && this.model.get('ingredients').off('change:value');
            }
            // unregister change listener from current metanode
            if(this.model.get('metanodeData')){
                this.model && this.model.get('metanodeData').off('change:name');
            }

            this.currentNode = nodeView.model;
            this.model = this.currentNode.get('properties');

            // Register change listener to update the model and label of the node
            let propertiesModel = this.model;
            let currentNode = this.currentNode;
            let workspace = this.workspaceGraph;
            let self = this;

            // re-render if there is a new custom ingredient file
            this.workspaceGraph.get('settings').on('change:customIngredients', function() {
                if(propertiesModel.get('customIngredientFiles')) {
                    propertiesModel.set('customIngredientFiles',  workspace.get('settings').get('customIngredients'));
                    self.render();
                }
            });

            // change label of process node
            this.model.on('change:processName', function() {
                let processName = _.find(self.processNames, { id: propertiesModel.get('processName') }).name;
                currentNode.setName(processName);
                $(nodeView.el).find('.label').text(processName);
            });

            // change label of ingredient append ingredients together
            if(this.model.get('ingredients')) {
                // add ingredients binding
                this.model.get('ingredients').bind('change:value', function() {
                    let ingredientsLabel = '';
                    const ingredients = propertiesModel.get('ingredients');
                    let numberOfIngredients = ingredients.length;
                    ingredients.forEach(ingredient => { 
                        if(ingredient.get('name')) {
                            ingredientsLabel +=  ingredient.get('name') + '\n';
                        }
                    });
                    // set label text
                    currentNode.setName(ingredientsLabel);
                    // each ingedient name needs -15 y offset to appear correctly above the node
                    if(numberOfIngredients > 1) {
                        currentNode.setLabelOffset(numberOfIngredients * -15);
                    } else {
                        currentNode.setLabelOffset(-15);
                    }
                    self.render();
                });
            }

            // set label of end product
            if(workspace.get('settings') && nodeTypes.END_NODE === currentNode.attributes.properties.get('type')) {
                const workflowName = workspace.get('settings').get('workflowName');
                currentNode.setName(workflowName);
                $(nodeView.el).find('.label').html(workflowName);
            }

            if(workspace.get('settings') && nodeTypes.END_NODE === currentNode.attributes.properties.get('type')) { 
                workspace.get('settings').on('change:workflowName', function() {
                    const workflowName = workspace.get('settings').get('workflowName');
                    currentNode.setName(workflowName);
                    $(nodeView.el).find('.label').html(workflowName);
                });
            }
            
            // set subworkflow label
            if(this.model.get('metanodeData')) {
                this.model.get('metanodeData').bind('change:name', function() {
                    const subworkflow = propertiesModel.get('metanodeData').models[0];
                    const labelSubWork = subworkflow.get('name');
                    currentNode.setName(labelSubWork);
                    $(nodeView.el).find('.label').html(labelSubWork);
                });
            }
        }
        this.render();
    },
    addParameterBindings: function() {
        let parameters = this.model.get('parameters').models;
        let self = this;
        _.each(parameters, function (parameterModel) {
            let parameterId = parameterModel.get('id');
            let bindings = {
                value: '#parameterInputValue' + parameterId
            };
            if (parameterModel.get('optional')) {
                bindings.name = '#parameterNameSelect' + parameterId;
            }
            if (parameterModel.get('unit') !== null) {
                bindings.unit = '#parameterUnitSelect' + parameterId;
            }
            let binder = new Backbone.ModelBinder(); // needs to be a new instance for each "bindings"!
            binder.bind(parameterModel, self.el, bindings);
            // Add a click listener for the remove button
            self.$el.find('#removeParameter' + parameterId).on('click', function() {
                // Remove the parameter
                self.model.get('parameters').remove(parameterId);
                // Re-render the section
                self.render();
            });
        });
    },
    addParameter: function() {
        let parametersCollection = this.model.get('parameters');
        let idString = "Param";
        let idNumber = 0;
        if (parametersCollection.size()) {
            idNumber = parseInt(parametersCollection.at(parametersCollection.size() - 1).get('id').replace(idString, '')) + 1;
        }
        let newParameter = new ParameterModel({
            id: idString + idNumber,
            timeValues: []
        });
        let self = this;
        newParameter.on('change:name', function(event, parameterNameId) {
            let categories = _.find(self.parameterNames, {id: parseInt(parameterNameId)}).category;          
            let units = [];
            _.each(categories.split(","), function(category) {
                units = units.concat(self.getUnitsOfCategory(category))
            });
            this.set('unitOptions', units);
            self.render();
        });
        parametersCollection.add(newParameter);
        this.render();
    },
    addIngredientBindings: function() {
        let ingredients = this.model.get('ingredients').models;
        let self = this;
        _.each(ingredients, function (ingredientModel) {
            let ingredientId = ingredientModel.get('id');
            let bindings = {
                value: '#ingredientValueSelect' + ingredientId,
                amount: '#ingredientAmountInput' + ingredientId,
                unit: '#ingredientUnitSelect' + ingredientId
            };
            let binder = new Backbone.ModelBinder(); // needs to be a new instance for each "bindings"!
            binder.bind(ingredientModel, self.el, bindings);
            // Add a click listener for the remove button
            self.$el.find('#removeIngredient' + ingredientId).on('click', function() {
                // Remove the parameter
                self.model.get('ingredients').remove(ingredientId);
                // Re-render the section
                self.render();
            });
        });
        // trigger event
        this.model.get('ingredients').trigger('change:value');
    },
    selectIngredientDropdownListener: function() {
        let self = this;
        const ingredientFiles = this.model.get('customIngredientFiles');

        self.$el.find('#selectIngredient').on('click', function() {
            let selectIngredients = $('.reveal-overlay').find('.ingredient-select');
            
            if(selectIngredients.length === 0) {
                selectIngredients = self.$el.find('.ingredient-select');
            }
            // remove options from dropdown
            selectIngredients.find('option').remove().end();
            // append first default
            selectIngredients.append($("<option />").val("default").text("default"));
            selectIngredients.append($("<option />").val("FoodOn").text("FoodOn"));
            // append files
            ingredientFiles.forEach(ingredient => {
                selectIngredients.append($("<option />").val(ingredient.filename).text(ingredient.filename));
            });
        });
    },
    addAmountAndUnitListener: function() {
        let ingredients = this.model.get('ingredients').models;
        let self = this;

        self.$el.find('.ingredient-amount').on('keyup', function() {
            // get ingredient id
            let ingredientId = $(this).parent().find('label').attr("value");
            
            for(let i=0; i< ingredients.length; i++) {
                if(ingredients[i].id === ingredientId) {
                    ingredients[i].set('amount', $(this).val());
                }
            }
        });

        self.$el.find('.property-unit').on('change', function() {
            // get ingredient id
            let ingredientId = $(this).parent().find('label').attr("value");
            
            for(let i=0; i< ingredients.length; i++) {
                if(ingredients[i].id === ingredientId) {
                    ingredients[i].set('unit', $(this).val());
                }
            }
        });
    },
    addEndProductBinding: function() {
        let self = this;
        const workflowName = this.workspaceGraph.get('settings').get('workflowName');

        // set a placeholder if no value is set
        if(!workflowName || workflowName.length === 0){
            self.$el.find('#endProductInput').text('<workflow name>');
        } else {
            self.$el.find('#endProductInput').text(workflowName);
            self.workspaceGraph.get('settings').trigger('change:workflowName');
        }

        self.$el.parent().find('#workflowNameInput').on('keyup change', function(){
            self.$el.find('#endProductInput').html(self.workspaceGraph.get('settings').get('workflowName'));
            self.workspaceGraph.get('settings').trigger('change:workflowName');
        })
    },
    addWorkFlowBinding: function() {
        let self = this;
        let metanodeData = this.model.get('metanodeData');
        let data = metanodeData.models[0];

        data.on('change:name', function(){
            self.$el.find('#subWorkflowInput').html(data.get('name'));
        });

        self.$el.find('#subWorkflowInput').on('keyup change', function() {
            data.set('name', $('#subWorkflowInput').val());
            // trigger event
            metanodeData.trigger('change:name');
        });
    },
    toggleFileDownloadArea: function(){
        let self = this;
        let metanodeData = this.model.get('metanodeData');
        let data = metanodeData.models[0];

        // hide or reveal the areas based on the file's existence 
        if(!data.get('file').filename || !data.get('file').filename.length === 0) {
            self.$el.find('.uploaded-file-download-area').hide();
            self.$el.find('.upload-subworkflow-area').show();
        } else {
            self.$el.find('.uploaded-file-download-area').show();
            self.$el.find('.upload-subworkflow-area').hide();
        }
    },
    addDownloadFileListener: function() {
        let self = this;
        let metanodeData = this.model.get('metanodeData');
        let metanodeDataFile = metanodeData.models[0].get('file');

        self.$el.find('.upload-workflow-download').on('click load', function() {
            self.$el.find('.upload-workflow-download').attr('download', metanodeDataFile.filename);
            self.$el.find('.upload-workflow-download').attr('href', metanodeDataFile.data);
        });
    },
    removeOldWorkflowFile: function() {
        let self = this;
        let metanodeData = this.model.get('metanodeData');
        

        self.$el.find('#removeOldWorkflowFile').on('click', function() {
            const fileId = metanodeData.models[0].get('file').id;
            // remove current file with a placeholder
            metanodeData.models[0].set('file',  {
                id: fileId,
                filename: "",
                data: null
              }
            );
            // hide download file area area
            self.toggleFileDownloadArea();
        });
    },
    loadSubWorkflowFileListener: function() {
        // convert the workspacegraph to a json object
        let exportJSON = this.workspaceGraph.toJSON();
        let self = this;
        let metanodeData = this.model.get('metanodeData');
        let metanodeModel = metanodeData.models[0];

        self.$el.find('.loadWorkflow').on('click', function() {

            // if the workflow is the main workflow that was worked before then set it in local storage
            if(self.workspaceGraph.get('settings').get('isMain')) {
                const stringifiedWorkspace = JSON.stringify(exportJSON, (key, value)=>{
                    if(key !== 'menu') {
                        return value;
                    }
                });
                localStorage.setItem('mainWorkflow', stringifiedWorkspace);
            }
                        
            const fileData = metanodeModel.get('file').data;
            if(fileData !== null) {
                let byteString;
                if (fileData.split(',')[0].indexOf('base64') >= 0) {
                    byteString = atob(fileData.split(',')[1]);
                } else {
                    byteString = unescape(fileData.split(',')[1]);
                }
                // separate out the mime component
                let mimeString = fileData.split(',')[0].split(':')[1].split(';')[0];
        
                let typedArray = new Uint8Array(byteString.length);
                for (let i = 0; i < byteString.length; i++) {
                    typedArray[i] = byteString.charCodeAt(i);
                }
        
                // convert file to blob
                const convertedFile = new Blob([typedArray], {type:mimeString});
        
                const fileReader = new FileReader();
                // read file
                fileReader.readAsText(convertedFile);
                // at the end of the file read
                fileReader.onloadend = function(event) {
                    const result = event.target.result;
                    const dataFromJSON = JSON.parse(result);
                    self.workspaceGraph.fromJSON(dataFromJSON);
                    // create metadata model
                    const metadataModel = new MetadataModel(dataFromJSON.settings);
                    metadataModel.set('isMain', false);
                    metadataModel.set('currentFileId', metanodeModel.get('file').id);
                    // set metadata model in workspace
                    self.workspaceGraph.set('settings', metadataModel);
                    // re-set menu metadata model and re-render the menu
                    self.workspaceGraph.get('menu').setMetadataModelAndRerender(metadataModel);
                }
            }
        });
    },
    addUploadWorflowFromJSONListener: function() {
        let self = this;
        let metanodeData = this.model.get('metanodeData');
        let data = metanodeData.models[0];

        this.$el.find('#uploadWorkflowJSON').on('change', function() {
            let files = this.files;
            // if therer are not files then do not continue
            if (!files || !files.length) {
                return;
            }

            // regex to check if it is indeed a json file
            const regex = /^([a-zA-Z0-9\s_\\.\-:])+(.json)$/;
            if(regex.test($('#uploadWorkflowJSON').val().toLowerCase())) {
                let fileReader = new FileReader();
                // read first file
                fileReader.readAsDataURL(files[0]);
                const filename = files[0].name
                // handle file results
                fileReader.onloadend = () => {
                    let fileData = fileReader.result;
                    const randomId = randomstring.generate(12);
                    // create file object
                    const file = {
                        id: randomId,
                        filename: filename,
                        data: fileData
                    }
                    // set file field of the metanode model
                    data.set('file', file);
                    // set file name in html
                    self.$el.find('.upload-workflow-download').text(filename);
                    // reveal div
                    self.toggleFileDownloadArea();
                    // add href and button
                    self.addDownloadFileListener();
                    // trigger metanode data
                    self.workspaceGraph.get('settings').set('lastSaved', new Date());
                };
            }
        });
    },
    // delete the node and clear the menu
    deleteCurrentNode: function() {
        if (!this.currentNode) {
            return;
        }
        this.currentNode.remove();
        delete this.currentNode;
        this.model = this.emptyModel;

        this.render();
    },
    initValidators: function() {
        let parameters = this.model.get('parameters').models;
        _.each(parameters, function (parameterModel) {
            let minValue;
            let maxValue;
            switch(parameterModel.get('name')) {
                case 'aw':
                    minValue = 0;
                    maxValue = 1;
                    break;
                case 'Temperature':
                    minValue = -273.15;
                    maxValue = 1000;
                    break;
                case 'pH':
                    minValue = 0;
                    maxValue = 14;
                    break;
            }
            let validationFunction = function() {
                return true;
            };
            if (minValue !== undefined && maxValue !== undefined) {
                validationFunction = function($el, required) {
                        if(!required) return true;
                        let value = $el.val();
                        return (minValue <= value && value <= maxValue);
                    };
            }
            Foundation.Abide.defaults.validators[parameterModel.get('id') + 'Validation'] = validationFunction;
        });
    },
    // Add an input port to the selected node
    addInPort: function(){
        this.currentNode && this.currentNode.addDefaultPort('in');
    },
    // Add an output port to the selected node
    addOutPort: function(){
        this.currentNode && this.currentNode.addDefaultPort('out');
    },
    // Remove an input port from the selected node
    removeInPort: function(){
        this.currentNode && this.currentNode.removeDefaultPort('in');
    },
    // Remove an output port from the selected node
    removeOutPort: function(){
        this.currentNode && this.currentNode.removeDefaultPort('out');
    },
    // create categories from the ingredients
    generateCategorizedIngredients : function(ingredients) {
            let catagorizedIngredients = {};
            // loop through the ingredients and set the categories
            ingredients.forEach(ingredient => {
                const category = ingredient.name[0];
                // check if the ingredient list already contains the category
                if(!catagorizedIngredients.hasOwnProperty(category)) {
                    catagorizedIngredients[category] = [ingredient];
                // if not create a category and push the ingedient
                } else {
                    const existingCategory = catagorizedIngredients[category];
                    existingCategory.push(ingredient);
                }
            });
            return catagorizedIngredients;
    },
    // Compare elements by name for sorting
    compareByName: function(a, b) {
        let nameA = a.name.toLowerCase();
        let nameB = b.name.toLowerCase();
        if (nameA < nameB)
            return -1;
        if (nameA > nameB)
            return 1;
        return 0;
    },
    // Compare elements by unit for sorting
    compareByUnit: function(a, b) {
        let unitA = a.unit.toLowerCase();
        let unitB = b.unit.toLowerCase();
        if (unitA < unitB)
            return -1;
        if (unitA > unitB)
            return 1;
        return 0;
    },
    getUnitsOfCategory: function(category) {
        return _.filter(this.allUnits, { 'category': category });
    }
});