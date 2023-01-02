/**
 *   This file declares and exports the view for a ingredient tree widget. The declaration contains all data bindings and events for the view.
 */

let $ = require('jquery');
let joint = require('jointjs/dist/joint.js');
let Backbone = require('backbone');
let _ = require('lodash');
require('jstree');

let ingredientTreeWidgetTemplate = require('../../templates/ingredients-tree-view.html');
let widgetTreeTemplate = require('../../templates/widgetTree.html');

let foodOnIngredientJSON = require('../../json/foodex.json');

import {IngredientModel}  from '../models/index.jsx';

export let IngredientTreeWidgetView = Backbone.View.extend({
    template: _.template(ingredientTreeWidgetTemplate),
    treeWidgetTemplate : _.template(widgetTreeTemplate),
    emptyModel: new Backbone.Model(),
    listenerAdded: false,
    categorizedIngredients: null,
    initialize: function(model, nodeId) {
        this.model = model;
        this.nodeId = nodeId;
    },
    render: function() {;
        this.$el.html(this.template(
                {
                    model: this.model, 
                    nodeId: this.nodeId
                }
            )
        );

        if(!this.listenerAdded) {
            const jsTreeData = this.createTreeData(this.catagorizedIngredients)
            this.$el.find('#widgetTreeArea').html(this.treeWidgetTemplate);
            this.createTreeView(jsTreeData);
            this.stickit();
            this.listenerAdded = true;
        }
        this.ingredientsChoiceChange();
        this.searchIngredientsListener();
        this.resetSearchOnClose();
    },
    resetSearchOnClose: function() {
        const defaultIngredients = this.catagorizedIngredients;
        let self = this;
        // reset search field and tree
        self.$el.find('.close-button').on('click', function() {
            $('.reveal-overlay').find('.search-ingredient').val('');
            $('.reveal-overlay').find('#ingredientsTree').jstree("clear_search");
            // reset jsTree data to default
            const jsTreeData = self.createTreeData(defaultIngredients);
            $('.reveal-overlay').find('#ingredientsTree').jstree(true).settings.core.data = jsTreeData;
            $('.reveal-overlay').find('#ingredientsTree').jstree(true).refresh(true, true);
        })
    },
    searchIngredientsListener: function() {
        let self = this;

        $('.reveal-overlay').find('.search-ingredient').on('keyup', function() {
            const searchIngredientInput = $(this).val();
            if(searchIngredientInput.length >= 3) {
                $('.reveal-overlay').find('#ingredientsTree').jstree('search', searchIngredientInput);
            } 
            
            if(searchIngredientInput.length === 0) {
                $('.reveal-overlay').find('#ingredientsTree').jstree("clear_search");
            }
        });

        self.$el.find('.search-ingredient').on('keyup', function() {
            const searchIngredientInput = $(this).val();
            if(searchIngredientInput.length >= 3) {
                $('.reveal-overlay').find('#ingredientsTree').jstree('search', searchIngredientInput);
            } 
            
            if(searchIngredientInput.length === 0) {
                $('.reveal-overlay').find('#ingredientsTree').jstree("clear_search");
            }
        });
    },
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
    handleCustomIngredientsCSV: function(blob) {
        let self = this;
        const fileReader = new FileReader();
        fileReader.onloadend = function(event) {
            const ingredients = [];
            let result = event.target.result;
            let rows = result.split('\n');
            rows.forEach(row => {
                let rowResults = row.split(';');
                for (let i = 0; i < rowResults.length; i++) {
                    // replace new line chars in the results
                    rowResults[i] = rowResults[i].replace('\r','');
                }

                // check if there are only two results in each row
                if(rowResults.length !== 2) {
                    return;
                }

                // push ingredient
                ingredients.push(
                    {
                        name: rowResults[0],
                        id: rowResults[1]
                    }
                )
            });
            const localCategorizedIngredients = self.generateCategorizedIngredients(ingredients);
            const jsTreeData = self.createTreeData(localCategorizedIngredients);
            // update js tree data
            $('.reveal-overlay').find('#ingredientsTree').jstree(true).settings.core.data = jsTreeData;
            $('.reveal-overlay').find('#ingredientsTree').jstree(true).refresh(true, true);
        }
        // read file as text
        fileReader.readAsText(blob);
    },
    ingredientsChoiceChange: function() {
        const defaultIngredients = this.catagorizedIngredients;
        const customFiles = this.model.get('customIngredientFiles');
        let self = this;
        self.$el.find('#ingredientChoiceSelect').on('change', function(){
            // get selection
            const selection = $(this);
            // if selection is the default then load the default urls
            if(selection.val() === 'default') {
                // create basic data
                const jsTreeData = self.createTreeData(defaultIngredients);
                $('.reveal-overlay').find('#ingredientsTree').jstree(true).settings.core.data = jsTreeData;
                $('.reveal-overlay').find('#ingredientsTree').jstree(true).refresh(true, true);
            } else if(selection.val() === 'FoodOn') {
                // create food on data
                const jsTreeData = self.generateFoodOnData();
                $('.reveal-overlay').find('#ingredientsTree').jstree(true).settings.core.data = jsTreeData;
                $('.reveal-overlay').find('#ingredientsTree').jstree(true).refresh(true, true);
            } else {
                for (let file of customFiles) {
                    if(file.filename === selection.val()) {
                        let byteString;
                        if (file.data.split(',')[0].indexOf('base64') >= 0) {
                            byteString = atob(file.data.split(',')[1]);
                        } else {
                            byteString = unescape(file.data.split(',')[1]);
                        }
                        // separate out the mime component
                        let mimeString = file.data.split(',')[0].split(':')[1].split(';')[0];

                        let typedArray = new Uint8Array(byteString.length);
                        for (let i = 0; i < byteString.length; i++) {
                            typedArray[i] = byteString.charCodeAt(i);
                        }

                        // convert file to blob
                        const convertedFile = new Blob([typedArray], {type:mimeString});
                        self.handleCustomIngredientsCSV(convertedFile);
                        break;
                    }
                }
            }
        })
    },
    buildTreeData: function(data, parentData) {
        if(data.hasChildren) {
            data.children.forEach(child => {
                if(child.hasChildren) {
                    // push it to the children
                    const categoryData = 
                    {
                        "text": child.text, 
                        "id": child.id + '-parent',
                        "icon" : "fa-solid fa-plus",
                        "children": []
                    };

                    // recursively call the data children
                    this.buildTreeData(child, categoryData);
                    // push to the parent
                    parentData.children.push(categoryData);
                } else {
                    // recursively call the data children
                    this.buildTreeData(child, parentData);
                }
                  
            });
        } else {
            const ingredients = this.model.get('ingredients').models;
            // variable which determines if each child should be pre-checked
            let shouldBeSelected = false;
            // set selectable checkbox
            for(const ingredient of ingredients) {
                if(ingredient.id === id) {
                    shouldBeSelected = true;
                    break;
                }
            }
            // create child object
            const childObject = { 
                "text" : data.text, 
                "id": data.id,  
                "icon" : "fa-solid fa-leaf",
                state : shouldBeSelected
            };
            // push it to the children
            parentData.children.push(childObject);
        }
    },
    generateFoodOnData: function() {
        let foodOnData = foodOnIngredientJSON[0].children;
        const jsTreeData = [];
        
        // loop through children to build data
        foodOnData.forEach(child => {
            const categoryData = 
                {
                    "text": child.text, 
                    "id": child.id,
                    "icon" : "fa-solid fa-plus",
                    "children": [] 
                }
            ;
            // build the children if they exist
            this.buildTreeData(child, categoryData);
            // push the data into the data
            jsTreeData.push(categoryData);
        });

        return jsTreeData;
    },
    createTreeData: function(catagorizedIngredients) {
        const ingredients = this.model.get('ingredients').models;
        // create js tree data to be rendered
        const jsTreeData = [];
        // ingredients for each category
        let children = [];
        // all the categories
        const categories = Object.keys(catagorizedIngredients);

        for(let i=0; i< categories.length; i++) {
            let ingredientsPerCategory = catagorizedIngredients[categories[i]];

            for(let j=0; j < ingredientsPerCategory.length; j++) {
                const id = ingredientsPerCategory[j]['id'];

                // variable which determines if each child should be pre-checked
                let shouldBeSelected = false;
                // set selectable checkbox
                for(const ingredient of ingredients) {
                    if(ingredient.id === id) {
                        shouldBeSelected = true;
                        break;
                    }
                }

                // create child object
                const childObject = { 
                    "text" : ingredientsPerCategory[j]['name'], 
                    "id": id,  
                    "icon" : "fa-solid fa-leaf",
                    state : { checked : shouldBeSelected }
                };
                children.push(childObject);
                // if the ingredients are looped through then push the parent-children data
                if(j === ingredientsPerCategory.length - 1) {
                    // append rootNode
                    jsTreeData.push({
                        "text": categories[i], 
                        "id": "tree-widget-category-" + categories[i],
                        "icon" : "fa-solid fa-plus",
                        "children": children  
                    });
                    // reset chidren data to be populated by the new node/category
                    children = [];
                }
            }
        }
        return jsTreeData;
    },
     // creates tree widget structure
     createTreeView: function(jsTreeData) {
        let self = this;
        let ingredientsCollection = this.model.get('ingredients');
        // create the the tree widget with the categories and ingredients
        self.$el.find('#ingredientsTree').jstree({
            'core':{
                'data' : jsTreeData,
                check_callback: false
            },
            checkbox: {       
                three_state : false, // to avoid that fact that checking a node also check others
                whole_node : false,  // to avoid checking the box just clicking the node 
                tie_selection : false // for checking without selecting and selecting without checking
              },
            'search' : {
                'case_insensitive': true,
                'show_only_matches': true
            },
            "plugins" : ["checkbox", "themes", "json_data", "ui", "types", "search"]
        // handle the check in of a tree
        }).on("check_node.jstree uncheck_node.jstree", function(e, data) {
            // if the ingredient is checked then push a new element into the list
            if(data.node.state.checked) {
                ingredientsCollection.add(new IngredientModel({
                    id: data.node.id,
                    value: data.node.id,
                    name: data.node.text,
                    amount: "0",
                    unit: ""
                }));
            // else remove it from the list
            } else {
                ingredientsCollection.remove(data.node.id)
            }
            // trigger event change event
            ingredientsCollection.trigger('change:value');
        }).on('open_node.jstree', function (e, data) { data.instance.set_icon(data.node, "fa-solid fa-minus"); 
        }).on('close_node.jstree', function (e, data) { data.instance.set_icon(data.node, "fa-solid fa-plus"); });
    },
    
});