"use strict";
(function() {
    let fs = Meteor.npmRequire("fs");
    let os = Meteor.npmRequire("os");
    Meteor.startup(function() {
        if (Files.find().count() < 5) {
            let demoFile = {
                "fileName": "demo.png",
                "chunks": [
                    [
                        "http://localhost:3500",
                        "http://localhost:3500"
                    ],
                    [
                        "http://localhost:4500",
                        "http://localhost:4500"
                    ]
                ]
            };
            Files.insert(demoFile);
            let demoFile2 = {
                "fileName": "favicon.ico",
                "chunks": [
                    [
                        "http://localhost:3500",
                        "http://localhost:3500"
                    ],
                    [
                        "http://localhost:4500",
                        "http://localhost:4500"
                    ]
                ]
            };
            Files.insert(demoFile2);
        }
        let interfaces = os.networkInterfaces();
        let addresses = [];

        for (var k in interfaces) {
            for (var k2 in interfaces[k]) {
                var address = interfaces[k][k2];
                if (address.family === 'IPv4' && !address.internal) {
                    addresses.push(address.address);
                }
            }
        }

        console.log(addresses);

    });
    Meteor.methods({
        findFile: function(fileName) {
            this.unblock;
            console.log("Finding the File Part Locations for: " + fileName.fileName);
            let file = Files.findOne({
                "fileName": fileName.fileName
            });
            console.log(JSON.stringify(file));
            let chunks = file.chunks.map(function(currentValue, index, array) {
                return currentValue[Math.floor(Math.random() * currentValue.length)];
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
            this.unblock;
            let file = Files.findOne({
                "fileName": fileName
            });
            if (!(typeof file !== "undefined" && file !== null)) {
                let fileToInsert = {
                    "fileName": fileName,
                    "chunks": []
                };
                for (let i = 0; i < numberOfParts; i++) {
                    fileToInsert.chunks.push([hostNameWithPort]);
                }
                Files.insert(fileToInsert);
            } else {
                for (let i = 0; i < file.chunks.length; i++) {
                    file.chunks[i].push(hostNameWithPort);
                }
                Files.update(file._id, file);
            }
        }
    });
}());

//# sourceMappingURL=PeerMeteor.map
