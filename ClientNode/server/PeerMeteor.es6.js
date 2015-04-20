"use strict";
(function () {
    let fs = Meteor.npmRequire("fs");
    let os = Meteor.npmRequire("os");
    let chunks = [];
    let writeLocation = "/Users/zackleman/Desktop/DDP-P2P/ClientNode/public/";
    let readLocation = "/Users/zackleman/Desktop/ClientNode2/public/";
    let TESTING_INDEX_NODES = [
        "http://localhost:5000",
        "http://localhost:6000"
    ];
    let ONE_MIB = 1048576;
    let CHUNK_SIZE = ONE_MIB;
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
            console.log("Last step before returning data");
            return {
                "rawData": data,
                "chunkNumber": chunkNumber
            };
        }
    });
    function findIndexNode() {
        return TESTING_INDEX_NODES[0];
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
        let filepath = readLocation + fileName;
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
        let base64File = fileSplit(readLocation + fileName, chunk);
        if (base64File.result === -1) {
            base64File = getWholeFile(readLocation + fileName, chunk);
        }
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
        let fileName = filePath;
        let parts = Async.runSync(function (done) {
            fs.stat(filePath, function (err, stats) {
                if (typeof err !== "undefined" && err !== null) {
                    console.error(err);
                    done(null, 0);
                }
                if (stats.isDirectory()) {
                    console.error(fileName + " is a directory, but must be a file");
                    done(null, 0);
                }
                if (stats.size < CHUNK_SIZE) {
                    console.log(fileName + " is less than " + CHUNK_SIZE / ONE_MIB + " MiB, won't be split");
                    done(null, 1);
                }
                let parts = Math.ceil(stats.size / CHUNK_SIZE);
                console.log(filePath + " will be split into " + parts);
                done(null, parts);
            });
        });
        return parts.result;
    }
    function fileSplit(file, chunkNumber) {
        let fileName = file;
        let fileChunk = Async.runSync(function (done) {
            fs.stat(file, function (err, stats) {
                if (typeof err !== "undefined" && err !== null) {
                    console.error(err);
                    return done(null, "");
                }
                if (stats.isDirectory()) {
                    console.error(file + " is a directory, but must be a file");
                    return done(null, "");
                }
                if (stats.size < CHUNK_SIZE) {
                    console.log(file + " is less than " + CHUNK_SIZE / ONE_MIB + " MiB, won't be split");
                    return done(null, -1);
                }
                done(null, 1);
            });
        });
        if (fileChunk.result === 1) {
            let readStream;
            let data = "";
            let start = CHUNK_SIZE * chunkNumber;
            let end = start + CHUNK_SIZE - 1;
            readStream = fs.createReadStream(file, {
                flags: "r",
                encoding: "base64",
                start: start,
                end: end
            });
            readStream.on("data", function (chunk) {
                data += chunk;
            });
            fileChunk = Async.runSync(function (done) {
                readStream.on("end", function () {
                    done(null, data);
                });
            });
        }
        return fileChunk;
    }
    function getWholeFile(fileName) {
        console.log("Returning Whole File As one Chunk");
        let encodedData = Async.runSync(function (done) {
            fs.readFile(fileName, function (err, original_data) {
                if (!(typeof err !== "undefined" && err !== null)) {
                    done(null, original_data.toString("base64"));
                } else {
                    console.log("error");
                }
            });
        });
        return encodedData;
    }
}());

//# sourceMappingURL=PeerMeteor.map