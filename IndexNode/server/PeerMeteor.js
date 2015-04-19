var fs = Meteor.npmRequire('fs');

Meteor.startup(function() {
    // Code to run once the first time the server is ever started. Creates a demo file reference
    if (Files.find().count() < 2) {

        var demoFile = {
            "fileName": "demo.png",
            "chunks": [
                ["http://localhost:3500", "http://localhost:3500"],
                ["http://localhost:4500", "http://localhost:4500"]
            ]
        };
        Files.insert(demoFile);

        var demoFile2 = {
            "fileName": "favicon.ico",
            "chunks": [
                ["http://localhost:3500", "http://localhost:3500"],
                ["http://localhost:4500", "http://localhost:4500"]
            ]
        };
        Files.insert(demoFile2);
    }

});


Meteor.methods({
    findFile: function(fileName) {
        console.log("Finding the File Part Locations for: " + fileName.fileName);

        var file = Files.findOne({
            "fileName": fileName.fileName
        });

        console.log(JSON.stringify(file));
        //Grab file part from one of the peers that has it.
        var chunks = file.chunks.map(function(currentValue, index, array) {
            return currentValue[Math.floor((Math.random() * currentValue.length))];
        });
        chunks = chunks.map(function(currentValue, index, array) {
            return {
                "chunkNumber": index,
                "chunk": currentValue
            };
        });

        console.log(JSON.stringify(chunks));

        return {
            "fileName": fileName.fileName,
            "chunks": chunks
        };
    },


    registerFile: function(fileName, numberOfParts, hostNameWithPort) {
        var file = Files.findOne({
            "fileName": fileName
        });

        if (!file) {
            //If file has not already been registered in the Index node
            var fileToInsert = {
                "fileName": fileName,
                "chunks": []
            };

            for (var i = 0; i < numberOfParts; i++) {
                fileToInsert.chunks.push([hostNameWithPort]);
            };

            Files.insert(fileToInsert);
        } else {
            //else add  to the file meta data that a new client has this file avalible
            for (var i = 0; i < numberOfParts; i++) {
                file.chunks[i].push(hostNameWithPort);
            };

            Files.update(file._id,file);
        }

    },



});
