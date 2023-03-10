/**
 *   This file declares and exports the view for a timetable. The declaration contains all data bindings and events for the view.
 */

let $ = require('jquery');
let joint = require('jointjs/dist/joint.js');
let Backbone = require('backbone');
let moment = require('moment');
let _ = require('lodash');

let timetableTemplate = require('../../templates/timetable.html');
let timetableListTemplate = require('../../templates/timetableList.html');

export let TimetableView = Backbone.View.extend({
    template: _.template(timetableTemplate),
    timetableListTemplate: _.template(timetableListTemplate),
    emptyModel: new Backbone.Model(),
    // Bind the content of the input fields to the model
    bindings: {
        '#timetableTimeInput': 'timetableTime',
        '#timetableValueInput': 'timetableValue'
    },
    // Bind events to appropriate functions
    listenerAdded: false,
    initialize: function(model, nodeId) {
        this.model = model;
        this.nodeId = nodeId;
        this.id = model.get('id');
    },
    render: function() {
        this.$el.html(this.template({model: this.model, nodeId: this.nodeId}));

        if (!this.listenerAdded) {
            this.$el.find('#timetableListSection' + this.id).html(this.timetableListTemplate({model: this.model}));
            this.addPropertyListener();
            this.uploadCSVListener();
            this.addBindings();
            this.stickit();
            this.listenerAdded = true;
        }
    },
    updateLastChanged: function() {
        this.model.set('lastChanged', new Date());
    },
    // Add a key value pair to the metadata
    addPropertyListener: function() {
        let self = this;
        this.$el.find('#addTimetableListButton').on('click', function() {
            // Add empty key value pair
            self.model.get('timeValues').push({ 0: 0});
            // Set element to the generated settings root element (generated by foundation)
            self.$el = $('.reveal-overlay');
            self.renderTimetableList();
        });

        // TODO Update last changed when edits are made
    },
    uploadCSVListener: function() {
        let self = this;
        this.$el.find('#uploadFromCSV').on('change', function() {
            let files = this.files;
            // if therer are not files then do not continue
            if (!files || !files.length) {
                return;
            }
            // regex to check if it is indeed a csv file
            const regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv)$/;

            // if it has a csv extension then proceed to upload the results
            if(regex.test($('#uploadFromCSV').val().toLowerCase())) {
                let fileReader = new FileReader();
                // read first file
                fileReader.readAsText(files[0]);
                // handle file results
                fileReader.onload = function(event) {
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

                    // the results need to be numbers
                    if(isNaN(rowResults[0]) || isNaN(rowResults[1])) {
                        return;
                    }

                    // push new values to the model
                    self.model.get('timeValues').push({ 0 : 0, key:rowResults[0], value: rowResults[1]});
                    // Set element to the generated settings root element (generated by foundation)
                    self.$el = $('.reveal-overlay');
                    self.renderTimetableList();
                    });
                }; 
            }   
        });
    },
    // Re-render the timetable and re-create the bindings
    renderTimetableList: function() {
        // Re-render the metadata section
        this.$el.find('#timetableListSection' + this.id).html(this.timetableListTemplate({model: this.model}));
        // Add bindings for all metadata inputs for data synchronization
        this.addBindings();
        // Scroll to bottom if the settings view is higher than the viewport
        this.$el.scrollTop(this.$el.children(':first').height());
    },
    // Add bindings for all metadata inputs for data synchronization
    addBindings: function() {
        for (let i = 0; i < this.model.get('timeValues').length; i++) { // TODO
            this.addMetadataBinding('key', i);
            this.addMetadataBinding('value', i);
            this.addRemoveButtonBinding(i);
        }
    },
    // Create a listener for the metadata attribute
    addMetadataBinding: function(type, index) {
        let self = this;
        this.$el.find('#timetableList-' + this.id + '-' + type + '-' + index).on('propertychange change click keyup input paste', function() {
            self.model.get('timeValues')[index][type] = $(this).val(); // TODO
        });
    },
    // Add a click listener remove button
    addRemoveButtonBinding: function(index) {
        let self = this;
        this.$el.find('#remove-timetable-row-' + index).on('click', function() {
            // Remove the metadata row from the array
            delete self.model.get('timeValues').splice(index, 1);
            // Re-render the section
            self.renderTimetableList();
        });
    }
});