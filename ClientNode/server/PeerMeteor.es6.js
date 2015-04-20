"use strict";
(function () {
    let fs = Meteor.npmRequire("fs");
    let os = Meteor.npmRequire("os");
    let chunks = [];
    let writeLocation = "/Users/zackleman/Desktop/DDP-P2P/ClientNode/public/";
    let readLocation = "/Users/zackleman/Desktop/ClientNode2/public/";
    let TESTING_INDEX_NODE = "http://localhost:5000";
    Meteor.startup(function () {
        getOwnIPAndPort();
    });
    Meteor.methods({
        registerFiletoShare: function (fileName) {
            this.unblock;
            registerFiletoShare(fileName);
        },
        download: function (file) {
            this.unblock;
            let fileName = file;
            let indexNodeIP = findIndexNode();
            let IndexNode = DDP.connect(indexNodeIP);
            IndexNode.call("findFile", { "fileName": fileName }, function (error, result) {
                if (typeof error !== "undefined" && error !== null) {
                } else {
                    console.log("Obtained File Location Information");
                    initPeerFileTransfer(result, fileName);
                }
            });
        },
        getFileChunks: function (requestedChunks) {
            this.unblock;
            let chunkNumber = requestedChunks.chunk;
            let fileName = requestedChunks.fileName;
            let data = getChunkOfFile(fileName, chunkNumber);
            return {
                "rawData": data,
                "chunkNumber": chunkNumber
            };
        }
    });
    function findIndexNode() {
        return TESTING_INDEX_NODE;
    }
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
    function registerFiletoShare(fileName) {
        let IndexNode = DDP.connect(findIndexNode());
        let hostNameWithPort = getOwnIPAndPort();
        let filepath = "/Users/zackleman/Desktop/ClientNode2/public/ " + fileName;
        let numberOfParts = splitFileCount(filepath);
        IndexNode.call("registerFile", fileName, numberOfParts, hostNameWithPort, function (error, result) {
            if (error) {
                console.log("Registration Failed");
            } else {
                console.log("Registered File with Index Server");
            }
        });
    }
    function getChunkOfFile(fileName, chunk) {
        console.log("Returning chunk File");
        let base64File = Async.runSync(function (done) {
            fs.readFile("/Users/zackleman/Desktop/ClientNode2/public/" + fileName, function (err, original_data) {
                let encodedData = original_data.toString("base64");
                let start;
                let amount;
                if (chunk === 0) {
                    start = 0;
                    amount = encodedData.length;
                } else {
                    start = encodedData.length;
                    amount = encodedData.length / chunks.length;
                }
                let chunkEncodedData = encodedData.substring(start, amount);
                done(null, chunkEncodedData);
            });
        });
        return {
            "base64File": base64File,
            "part": chunk
        };
    }
    function concatFile(chunkList) {
        chunkList.sort(function (a, b) {
            if (a.chunkNumber < b.chunkNumber) {
                return -1;
            } else {
                return 1;
            }
        });
        let data = chunkList[0].rawData.base64File.result;
        for (let i = 1; i < chunkList.length; i++) {
            data += chunkList[i].rawData.base64File.result;
        }
        return data;
    }
    function writeConcatedFile(base64String, fileName) {
        let decodedImage = new Buffer(base64String, "base64");
        fs.writeFile(writeLocation + fileName, decodedImage, function (err) {
        });
        resetForNextFileTransfer(fileName);
    }
    function resetForNextFileTransfer(fileName) {
        chunks = [];
        registerFiletoShare(fileName);
    }
    function initPeerFileTransfer(chunkHolder, fileName) {
        console.log("Start Calling Peers for file transfer");
        for (let chunk = 0; chunk < chunkHolder.chunks.length; chunk++) {
            let peer = DDP.connect(chunkHolder.chunks[chunk].chunk);
            peer.call("getFileChunks", {
                "fileName": fileName,
                "chunk": chunk
            }, function (error, result) {
                if (typeof error !== "undefined" && error !== null) {
                    console.log("ERROR for peer: " + chunk);
                } else {
                    console.log("Retrieved peer: " + chunk + " info");
                    chunks.push(result);
                    if (chunks.length === chunkHolder.chunks.length) {
                        let concatedFile = concatFile(chunks);
                        writeConcatedFile(concatedFile, fileName);
                    }
                }
            });
        }
    }
    function splitFileCount(filePath) {
        return 10;
    }
}());

//# sourceMappingURL=PeerMeteor.map