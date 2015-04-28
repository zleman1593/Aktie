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
        registerFile: function (fileName, numberOfParts, hostNameWithPort) {
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
                    file.chunks[i].push(hostNameWithPort);
                }
                Files.update(file._id, file);
            }
        }
    });
    function getOwnIPAndPort() {
        let interfaces = os.networkInterfaces();
        let addresses = [];
        for (let k of interfaces) {
            for (let k2 of interfaces[k]) {
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