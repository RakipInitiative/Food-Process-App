/**
 *   This file declares and exports a model for the metadata of the workflow. It declares all attributes that are detached to a workflow.
 */

let Backbone = require('backbone');

import { CustomCollection } from './collection.jsx';

export let MetadataModel = Backbone.Model.extend({
    defaults: {
        workflowName: '',
        author: '',
        reference: '',
        description: '',
        created: '',
        lastChanged: '',
        lastSaved: '',
        customIngredients: [],
        isMain: true,
        currentFileId: '',
        metadata: null // instance of AdditionalMetadataCollection
    },
    initialize: function() {
        Backbone.Model.prototype.initialize.apply(this, arguments);
        let additionalMetadata = new AdditionalMetadataCollection();
        if (this.get('metadata')) {
            for (let metadataModel of this.get('metadata')) {
                additionalMetadata.add(new AdditionalMetadataModel(metadataModel));
            }
        }
        this.set('metadata', additionalMetadata);
    }
});

export let AdditionalMetadataModel = Backbone.Model.extend({
    defaults: {
        id: undefined,
        key: '',
        value: ''
    }
});

export let AdditionalMetadataCollection = CustomCollection.extend({
    model: AdditionalMetadataModel
});