
Meteor.publish("allFiles", function () {
  return Files.find({});
});