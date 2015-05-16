//This sends data from the server to the GUI

Meteor.publish("allFiles", function () {
  return Files.find({});
});



Meteor.publish("allBackupFiles", function () {
  return BackupForPartner.find({});
});