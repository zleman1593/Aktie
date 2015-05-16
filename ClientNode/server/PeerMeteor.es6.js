"use strict";
(function () {
    let randomAccessFile = Meteor.npmRequire("random-access-file");
    let fs = Meteor.npmRequire("fs");
    let os = Meteor.npmRequire("os");
    let chunks = [];
    let missingChunks = [];
    let SERVER_DELAY = 1500;
    let numberOfParts = 0;
    let writeLocation = '../web.browser/app/';//"/home/zleman/";
    let readLocation = writeLocation;
    let currentIndexNodes = [
        "http://IndexNode0.meteor.com",
        "http://IndexNode.meteor.com",
        "http://IndexNode2.meteor.com",
        "http://IndexNode3.meteor.com"
    ];
    let ONE_MIB = 1048576;
    let CHUNK_SIZE = ONE_MIB * 5;
    let IndexNode;
    let distributeIO = false;
    let transferComplete = true;
    let openFileName = null;
    let openFD = null;
    Meteor.startup(function () {
        getOwnIPAndPort();
      //   var host = '52.74.183.164:9998';
      //   console.log(host);
      //    let peer = DDP.connect(host);
      //   let status = Async.runSync(function (done) {
      //       setTimeout(function () {
      //           done(null, peer.status());
      //       }, SERVER_DELAY);
      //   });
      //   if (status.result.connected) {
      // console.log("YAYA");
      //   } else{
      //             console.log("boo");
      //   }

    });

let missCount = 0;
let fullCount = 0;
    let startTime;

    Meteor.methods({
        registerFiletoShare: function (fileName) {
            this.unblock;
            // let error = registerFiletoShare(fileName);
            // if (typeof error !== "undefined" && error !== null) {
            //     throw new Meteor.Error(500, "Error 500: Not found", "the file is not found");
            // }
        },
        getShareableFiles: function () {
            this.unblock;
            let result = fs.readdirSync(readLocation);
            console.log(result);
            return result;
        },
        getPercent: function () {
            this.unblock;
            return chunks.length / numberOfParts * 100;
        },
        download: function (file) {
            this.unblock;
            let fileName = file;
            IndexNode = (typeof IndexNode !== "undefined" && IndexNode !== null ? IndexNode.status().connected : void 0) ? IndexNode : DDP.connect(findIndexNode(fileName));
            IndexNode.call("findFile", { "fileName": fileName }, function (error, result) {
                if (typeof error !== "undefined" && error !== null) {
                    console.log(error.reason);
                    throw new Meteor.Error(240, "Error 320: Could Not find file", "A file by this name has not been registered.");
                } else {
                    console.log("Obtained File Location Information");
                    transferComplete = false;

                    startTime = new Date();
                    console.log(JSON.stringify(result));
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
    function findIndexNode(fileName) {
        return currentIndexNodes[hash(fileName)];
    }
    function getOwnIPAndPort() {
        console.log(process.env.IP + ":" + process.env.PORT);
        return process.env.IP + ":" + process.env.PORT;
    }
    function registerFiletoShare(fileName) {
        // let filepath = readLocation + fileName;
        // numberOfParts = splitFileCount(filepath);
        // if (typeof numberOfParts.error !== "undefined" && numberOfParts.error !== null) {
        //     return numberOfParts.error;
        // }
        // IndexNode = !!IndexNode && !!IndexNode.status().connected ? IndexNode : DDP.connect(findIndexNode(fileName));
        // let hostNameWithPort = getOwnIPAndPort();
        // IndexNode.call("registerFile", fileName, numberOfParts.result, hostNameWithPort, false, function (error, result) {
        //     if (error) {
        //         console.log("Registration Failed");
        //     } else {
        //         console.log("Registered File with Index Server");
        //     }
        // });
    }
    function registerFileChunkToShare(fileName, chunkNumber) {
        // IndexNode = (typeof IndexNode !== "undefined" && IndexNode !== null ? IndexNode.status().connected : void 0) ? IndexNode : DDP.connect(findIndexNode(fileName));
        // let hostNameWithPort = getOwnIPAndPort();
        // IndexNode.call("registerFileChunk", fileName, chunkNumber, hostNameWithPort, false, function (error, result) {
        //     if (error) {
        //         console.log("Registration of Chunk Failed");
        //     } else {
        //         console.log("Registered File Chunk with Index Server");
        //     }
        // });
    }
    function getChunkOfFile(fileName, chunk) {
        if (fileName === openFileName) {
            let offset = CHUNK_SIZE * chunk;
            let length = CHUNK_SIZE;
            let base64File = Async.runSync(function (done) {
                openFD.read(offset, length, function (err, buffer) {
                    done(null, buffer);
                });
            });
            return {
                "base64File": base64File,
                "part": chunk
            };
        } else {
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
        Async.runSync(function (done) {
            let decodedImage = new Buffer(base64String, "base64");
            fs.writeFile(writeLocation + fileName, decodedImage, function (err) {
                done(null, null);
            });
        });
    }
    function writeFileRandomly(base64String, fileName, chunkNumber) {
        let decodedImage = new Buffer(base64String, "base64");
        let offset = CHUNK_SIZE * chunkNumber;
        let file = randomAccessFile(writeLocation + fileName);
        Async.runSync(function (done) {
            file.write(offset, decodedImage, function (err) {
                done(null, "closed");
            });
        });
        return file;
    }
    function resetForNextFileTransferIfFileWasConcatedInMemory(fileName) {
        chunks = [];
        missingChunks = [];
        //registerFiletoShare(fileName);
        numberOfParts = 0;
    }
    function resetForNextFileTransferIfFileWasConcatedOnDisk() {
        chunks = [];
        missingChunks = [];
        openFileName = null;
        openFD = null;
        numberOfParts = 0;
    }
    function initPeerFileTransfer(chunkHolder, fileName) {
        console.log("Start Calling Peers for file transfer");
        numberOfParts = chunkHolder.chunks.length;
        for (let chunk = 0; chunk < chunkHolder.chunks.length; chunk++) {
            let host = chunkHolder.chunks[chunk].chunk;
            Meteor.defer(function () {
                getChunk(chunk, fileName, host, numberOfParts, true);
            });
        }
        let checkTimer = setInterval(Meteor.bindEnvironment(function () {
              console.log("Have all initial attemps to get chunks been made?");
              var end = new Date();
                        var diff = end - startTime;
                        console.log(diff);
            if (missingChunks.length + chunks.length === numberOfParts) {
                clearTimeout(checkTimer);
                while (missingChunks.length !== 0) {
                    var retry =  missingChunks.pop();
                    getChunk(retry.chunkNumber, fileName,retry.chunk, numberOfParts, false);
                }
            } else {
                console.log("Not yet. Currently we have only tried to get " + (missingChunks.length + chunks.length) + "chunks.");
                 console.log("" + missingChunks.length + "    " + chunks.length);
                    //console.log("" + missCount + "    " + fullCount);
                if (transferComplete) {
                    clearTimeout(checkTimer);
                }
            }
        }), 1000);
    }
    function getChunk(chunk, fileName, host, numberOfParts, firstTime) {
        if (getOwnIPAndPort() === host) {
            return;
        }
        let peer = DDP.connect(host);
        let status = Async.runSync(function (done) {
            setTimeout(function () {
                done(null, peer.status());
            }, SERVER_DELAY);
        });
        if (status.result.connected) {
            let hostHolder = host;
            console.log("Peer " + chunk + " available!");
            peer.call("getFileChunks", {
                "fileName": fileName,
                "chunk": chunk
            }, function (error, result) {
                if (typeof error !== "undefined" && error !== null) {
                    console.log("ERROR during connection to peer: " + chunk);
                } else {
                    console.log("Retrieved peer: " + chunk + " info");
                    if (!distributeIO) {

                        chunks.push(result);
                    } else {
                        fullCount++;
                        chunks.push(chunk);
                        openFD = writeFileRandomly(result.rawData.base64File.result, fileName, chunk);
                        openFileName = openFD.fileName;
                        //registerFileChunkToShare(fileName, chunk);
                    }
                    if (chunks.length === numberOfParts) {
                        transferComplete = true;
                        var end = new Date();
                        var diff = end - startTime;
                        console.log(diff);
                        if (!distributeIO) {
                            let concatedFile = concatFile(chunks);
                            writeConcatedFile(concatedFile, fileName);
                            resetForNextFileTransferIfFileWasConcatedInMemory(fileName);
                        } else {
                            openFD.close(function () {
                                console.log("file is closed");
                            });
                            resetForNextFileTransferIfFileWasConcatedOnDisk();
                        }
                    }
                }
            });
        } else {
            peer.disconnect();
            console.log("Could not connect to peer server for chunk " + chunk);
            IndexNode = !!IndexNode && !!IndexNode.status().connected ? IndexNode : DDP.connect(findIndexNode(fileName));
            console.log("Connection to IndexNode: " + IndexNode.status());
            IndexNode.call("getReplacementChunk", {
                "fileName": fileName,
                "chunkNumber": chunk,
                "badMachine": host
            }, function (error, result) {
                if (typeof error !== "undefined" && error !== null) {
                    console.log("Error: Could not Obtain Replacement Chunk location From Index");
                } else {
                    console.log("Obtained Replacement Chunk File Location Information: " + JSON.stringify(result.chunk));
                    if (firstTime) {
                        missCount++;
                        missingChunks.push(result.chunk);
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
                    return done(err, null);
                }
                if (stats.isDirectory()) {
                    console.error(fileName + " is a directory, but must be a file");
                    return done(null, 0);
                }
                if (stats.size < CHUNK_SIZE) {
                    console.log(fileName + " is less than " + CHUNK_SIZE / ONE_MIB + " MiB, won't be split");
                    return done(null, 1);
                }
                let parts = Math.ceil(stats.size / CHUNK_SIZE);
                console.log(filePath + " will be split into " + parts);
                return done(null, parts);
            });
        });
        return parts;
    }
    function fileSplit(file, chunkNumber) {
        let fileName = file;
        let fileChunk = Async.runSync(function (done) {
            fs.stat(file, function (err, stats) {
                if (typeof err !== "undefined" && err !== null) {
                    console.error(err);
                    return done(err, null);
                }
                if (typeof stats !== "undefined" && stats !== null ? stats.isDirectory() : void 0) {
                    console.error(file + " is a directory, but must be a file");
                    return done({ "reason": file + " is a directory, but must be a file" }, null);
                }
                if (stats.size < CHUNK_SIZE) {
                    console.log(file + " is less than " + CHUNK_SIZE / ONE_MIB + " MiB, won't be split");
                    return done(null, -1);
                }
                done(null, 1);
            });
        });
        if (fileChunk.result === 1) {
            let data = "";
            let readStream;
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
    function hash(fileName) {
        let sum = 0;
        for (let i = 0; i < fileName.length; i++) {
            sum += fileName.charCodeAt(i);
        }
        let bucket = sum % 4;
        return bucket;
    }
    function getPercent() {
        this.unblock;
        return chunks.length / numberOfParts * 100;
    }
}());

//# sourceMappingURL=PeerMeteor.map