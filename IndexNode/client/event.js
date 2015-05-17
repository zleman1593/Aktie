Session.setDefault("item", true);

Template.displayFiles.helpers({
    files: function() {
        return Files.find();
    },
    anyFiles: function() {
        if (Files.find().count !== 0) {
            return true;
        }
        return false;
    }

});

Template.displayFiles.events({


    'click #action': function(event) {
        event.preventDefault();

    },

});


Template.file.helpers({
    chunkCount: function() {
        return this.chunks.length;
    },

});

Template.FileDetails.helpers({
    chunkCount: function() {
        return this.chunks.length;
    },

});


Template.file.events({


    'click #unregister': function(event) {
        event.preventDefault();
        Files.remove({
            _id: this._id
        });
        Materialize.toast("Unregistered File");
    },


});


/*Template.peers.helpers({
    peer: function() {
        return this.chunks;
    },
    


});*/
