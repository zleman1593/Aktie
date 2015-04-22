Template.startQuery.helpers({
    activeLabel: function() {

    }

});

Template.startQuery.events({

    'click #search': function(event) {
        event.preventDefault();

        var fileName = $('#fileName').val();

        Meteor.call('download',
            fileName,
            function(error, result) {
                if (error) {

                } else {

                }
            });

    },


    'click #register': function(event) {
        event.preventDefault();
        var fileName = $('#fileName').val();
        Meteor.call('registerFiletoShare', fileName, function(error, result) {
            if (error) {
                alert(error.message);
            } else {
                alert("Registration Successful!!");
            }
        });

    },


});
