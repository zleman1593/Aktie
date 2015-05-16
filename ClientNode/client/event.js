Session.setDefault('percent', 0);
Session.setDefault('shareableFiles', []);
Session.setDefault('downloading', false);
Session.setDefault('showSearchBar', true);

var oldTimer;//For percentage

var timer;



Template.main.helpers({
    home: function() {
        return Session.get("showSearchBar");
    }

});



Template.main.events({

    'submit form': function(e, template) {
        e.preventDefault();

        //var fileName = $(e.target).find('[name=body]');

        var fileName = $('#search').val();

        Meteor.call('download',
            fileName,
            function(error, result) {
                if (error) {
                    Materialize.toast(error.message, 5000);
                } else {
                    Materialize.toast("Started Download", 5000);
                    Session.set('downloading', true);
                    //Start timer
                      timer.start();
                }
            });
    }


});
Template.startQuery.helpers({
    shareableFiles: function() {
        return Session.get('shareableFiles');
    },

    percentTransfer: function() {
        var percent = Session.get('percent');
        if (percent === 100) {
            Session.set('downloading', true);
            clearTimeout(oldTimer);
        }
        return "" + percent;
    },
});

Template.startQuery.events({

    'click #refresh': function(event) {
        event.preventDefault();
        Meteor.call('getShareableFiles', function(error, result) {
            if (error) {
                Materialize.toast(error.message, 5000);
            } else {
                Materialize.toast("Found Avalible Files", 5000);
                Session.set('shareableFiles', result);
            }
        });
    },


});

Template.startQuery.onRendered(function() {

  timer = new Tock({
                callback: function () {
                    $('#clockface').val(timer.msToTime(timer.lap()));
                }
            });


    Session.set('showSearchBar', false);
    oldTimer = setInterval(function() {

        if (Session.get('downloading')) {

            Meteor.call('getPercent', function(error, result) {
                if (error) {
                    Materialize.toast(error.message, 5000);
                } else {
                    console.log(result);
                    Session.set('percent', result);

                       if (result === 100) {
                        //Stop timer
                         timer.stop();

                          Session.set('percent', 0);
                       }
                }
            });

        }

    }, 1000);

});

Template.startQuery.onDestroyed(function() {

    Session.set('showSearchBar', true);
});


Template.file.events({

    'click #register': function(event) {
        event.preventDefault();
          var fileName = $(event.target).parent().find('.title').attr('value');

        Meteor.call('registerFiletoShare', fileName, function(error, result) {
            if (error) {
                Materialize.toast(error.message, 5000);
            } else {
                Materialize.toast("Registration Successful!!", 5000);
                $(event.target).removeClass('red');
                $(event.target).addClass('disabled');

            }
        });
    }


});
