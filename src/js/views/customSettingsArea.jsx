/**
 *   This file declares and exports the view for the custom settings view. The declaration contains all data bindings and events for the view.
 */

let $ = require('jquery');
let joint = require('jointjs/dist/joint.js');
let Backbone = require('backbone');
let _ = require('lodash');
let randomstring = require("randomstring");

let customSettingsAreaTemplate = require('../../templates/custom-settings-area.html');
let customSettingsAreaIngredientsTemplate = require('../../templates/custom-settings-area-ingredients-files.html');


export let CustomSettingsAreaView = Backbone.View.extend({
    template: _.template(customSettingsAreaTemplate),
    customIngredientsTemplate: _.template(customSettingsAreaIngredientsTemplate),
    emptyModel: new Backbone.Model(),
    listenerAdded: false,
    initialize: function(model, nodeId) {
        this.model = model;
        this.nodeId = nodeId;
    },
    render: function() {
        let settingsModalSelector = '.reveal-overlay > #customSettings';
        $(settingsModalSelector).parent().remove()
        this.$el.html(this.template(
                {
                    model: this.model, 
                    nodeId: this.nodeId
                }
            )
        );
        this.renderCustomIngredientsSection();
        this.$el.foundation();
        // Set element to the generated settings root element (generated by foundation)
        this.$el = $(settingsModalSelector).parent();
        this.uploadCustomIngredientsFileListener();
        this.removeCustomIngredientFileListener();
        this.stickit();
    },
    renderCustomIngredientsSection: function() {
        // Re-render the metadata section
        this.$el.find('#customIngredientsFileSection').html(this.customIngredientsTemplate({model: this.model}));
        // add remove binder
        this.removeCustomIngredientFileListener();
        // Scroll to bottom if the settings view is higher than the viewport
        this.$el.scrollTop(this.$el.children(':first').height());
    },
    removeCustomIngredientFileListener: function () {
        let customIngredients = this.model.get('customIngredients');
        let self = this;

        this.$el.find('.removeCustomIngredientFile').on('click', function() {
            // get the element id and split it to find the file id
            let buttonIdSplit = $(this).attr("id").split('-');
            // remove the file
            for(let i=0; i< customIngredients.length; i++) {
                if(customIngredients[i].id === buttonIdSplit[1]) {
                    self.model.get('customIngredients').splice(i, 1);
                    break;
                }
            }
             // re-render custom files area
             self.renderCustomIngredientsSection();
        });
    },
    uploadCustomIngredientsFileListener: function() {
        // get the custom ingredients from the metadata model
        let customIngredients = this.model.get('customIngredients');
        let self = this;

        this.$el.find('#uploadCustomIngredients').on('change', function() {
            let files = this.files;
            // if there are not files then do not continue
            if (!files || !files.length) {
                return;
            }
            // regex to check if it is indeed a csv file
            const regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv)$/;

            // if it has a csv extension then proceed to upload the results
            if(regex.test($('#uploadCustomIngredients').val().toLowerCase())) {
                let fileReader = new FileReader();
                // read first file as base64
                fileReader.readAsDataURL(files[0]);
                const filename = files[0].name
                // handle file loading results
                fileReader.onloadend = () => {
                    let fileData = fileReader.result;

                    const randomId = randomstring.generate(12);
                    // create file object
                    const file = {
                        id: randomId,
                        filename: filename,
                        data: fileData
                    }
                    // push custom file in 
                    customIngredients.push(file);
                    // re-render custom files area
                    self.renderCustomIngredientsSection();
                }
            }
        });
    },

})