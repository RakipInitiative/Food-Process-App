/* 
 * External dependencies 
 */

// General purpose
window.$ = window.jQuery = require('jquery');
let _ = require('lodash');
let Backbone = require('backbone');

// Stickit for easier data binding
require('backbone.stickit');

// JointJS
let joint = require('jointjs/dist/joint.js');
require('jointjs/dist/joint.css');

// Foundation
require('foundation-sites/dist/css/foundation.css');
require('foundation-sites/dist/js/foundation.js');

// Icon font
require('font-awesome/css/font-awesome.css');
require('font-awesome/css/font-awesome.min.css');
require('@fortawesome/fontawesome-free/css/all.css');
require('@fortawesome/fontawesome-free/js/all.js');

// Library for widgets
require('jstree');
// random string library
require("randomstring");

/* 
 * Application dependencies
 */

// Stylesheets
require('../scss/main.scss');

// CSV files

let processesCSV = require('../cv/processes.csv');
let foodOnIngredientJSON = require('../json/foodex.json')


// Templates
let appTemplate = require('../templates/app.html');

// views
import {WorkspaceView, MenuView, PropertiesView} from './views/index.jsx';

let AppView = Backbone.View.extend({
    el: '#app',
    template: _.template(appTemplate),
    initialize: function() {
        this.render();
    },
    render: function() {
        // message for Safari users
        var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || safari.pushNotification);
        if(isSafari) {
            alert("Note: It appears that you are using a Safari browser, which is not fully supported. Some features of the application may cause issues. We recommend using another browser like Firefox or Chrome.");
        }

        this.$el.html(this.template({}));

        // delete workflow if it exists in the local storage
        if(localStorage.getItem('mainWorkflow')) {
            localStorage.removeItem('mainWorkflow')
        }

        // Workspace graph // JointJs graph
        let workspaceGraph = new joint.dia.Graph({}, {cellNamespace: joint.shapes});
        // Element to render the workspace in
        let workspaceElement = this.$('#workspace');

        // Render the properties
        this.properties = new PropertiesView(workspaceGraph);
        this.properties.setElement(this.$('#properties'));
        this.properties.render();

        // Render the workspace
        this.workspace = new WorkspaceView(workspaceGraph, this.properties);
        this.workspace.setElement(workspaceElement);
        this.workspace.render();

        // Render the menu
        this.menu = new MenuView(workspaceGraph, workspaceElement, this.workspace.getWorkspace());
        this.menu.setElement(this.$('#menu'));
        this.menu.render();

        this.addKeydownListener();
    },
    // Listen for keydown events
    addKeydownListener: function() {
        let self = this;
        $(document).keydown(function(event) {
            // Do not handle keydown if any element is in focus
            if (!$(event.target).is("body")) {
                return;
            }
            // 46 = DEL, 8 = BACKSPACE
            if (event.keyCode === 46 || event.keyCode === 8) {
                // Delete currently selected node
                self.properties.deleteCurrentNode();
            }
            // add more key handling here!
        });
    },
});

let appView = new AppView();
