"use strict";
(function () {
    let fs = Meteor.npmRequire("fs");
    let os = Meteor.npmRequire("os");
    let SERVER_DELAY = 500;
    Meteor.startup(function () {
        getOwnIPAndPort();
        let host = "http://IndexNode.meteor.com";
        let server = DDP.connect(host);
        let status = Async.runSync(function (done) {
            setTimeout(function () {
                done(null, server.status());
            }, SERVER_DELAY);
        });
        if (status.result.connected) {
            console.log("Connected");
        } else {
            console.log("Not Connected");
        }
    });
    Meteor.methods({
        findFile: function (fileName) {
            this.unblock;
            console.log("Finding the File Part Locations for: " + fileName.fileName);
            let file = Files.findOne({ "fileName": fileName.fileName });
            console.log(JSON.stringify(file));
            let chunks = file.chunks.map(function (currentValue, index, array) {
                return currentValue[Math.floor(Math.random() * currentValue.length)];
            });
            chunks = chunks.map(function (currentValue, index, array) {
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
        getReplacementChunk: function (info) {
            this.unblock;
            console.log("Finding the New File Part Location for: " + info.fileName + ": Chunk " + info.chunkNumber);
            let file = Files.findOne({ "fileName": info.fileName });
            let chunkLocations = file.chunks[info.chunkNumber];
            let chunk = {
                "chunkNumber": info.chunkNumber,
                "chunk": chunkLocations[Math.floor(Math.random() * chunkLocations.length)]
            };
            console.log(JSON.stringify(chunk));
            return {
                "fileName": info.fileName,
                "chunk": chunk
            };
        },
        registerFile: function (fileName, numberOfParts, hostNameWithPort, updateFromIndexNode) {
            this.unblock;
            let file = Files.findOne({ "fileName": fileName });
            if (!(typeof file !== "undefined" && file !== null)) {
                let fileToInsert = {
                    "fileName": fileName,
                    "chunks": []
                };
                console.log("registering new File with " + numberOfParts + " parts");
                for (let i = 0; i < numberOfParts; i++) {
                    fileToInsert.chunks.push([hostNameWithPort]);
                }
                Files.insert(fileToInsert);
            } else {
                for (let i = 0; i < file.chunks.length; i++) {
                    if (!_.contains(file.chunks[i], hostNameWithPort)) {
                        file.chunks[i].push(hostNameWithPort);
                    }
                }
                Files.update(file._id, file);
            }
        },
        registerFileChunk: function (fileName, chunkNumber, hostNameWithPort, updateFromIndexNode) {
            console.log("fileName: " + fileName + ". chunkNumber: " + chunkNumber);
            let file = Files.findOne({ "fileName": fileName });
            if (typeof file !== "undefined" && file !== null) {
                file.chunks[chunkNumber].push(hostNameWithPort);
                Files.update(file._id, file);
            } else {
                throw new Meteor.Error(500, "Error 500: Not registered", "A file by this name has not been registered.");
            }
        }
    });
    function getOwnIPAndPort() {
        let interfaces = os.networkInterfaces();
        let addresses = [];
        for (let k in interfaces) {
            for (let k2 in interfaces[k]) {
                let address = interfaces[k][k2];
                if (!!(address.family === "IPv4") && !address.internal) {
                    addresses.push(address.address);
                }
            }
        }
        console.log(addresses[0] + ":" + process.env.PORT);
        return addresses[0] + ":" + process.env.PORT;
    }
}());

//# sourceMappingURL=PeerMeteor.map