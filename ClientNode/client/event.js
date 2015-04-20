Session.setDefault("item", true);

Template.startQuery.helpers({
    activeLabel: function() {

    }

});

Template.startQuery.events({

    'click #search': function(event) {
        event.preventDefault();

        //var fileName = $('#fileName').val();
        //var fileName = "news.pdf";
        var fileName = "demo.png";
    //     if (Session.get("item")) {
    //     		fileName = "pdf.pdf";
    //             //fileName = "demo.png";
    //         Session.set("item", false);
    //     } else {
		  // fileName = "favicon.ico";
      
    //     }

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


        Meteor.call('registerFiletoShare',"news.pdf", function(error, result) {
                if (error) {

                } else {

                }
            });

    },


});
