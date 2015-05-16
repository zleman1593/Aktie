"use strict";
(function () {
    let fs = Meteor.npmRequire("fs");
    let os = Meteor.npmRequire("os");
    let SERVER_DELAY = 500;
    let backupTask = new ScheduledTask("at 12:01 am", function () {
        backupPartnerToSelf();
        console.log("Backup was run.");
    });
    let heartbeatCheck = new ScheduledTask("every 30 sec", function () {
        if (PartnerIndex.status().connected) {
            console.log("Partner is healthy!");
        } else {
            console.log("Partner is DOWN!");
            console.log("Spawning replacement!");
            console.log("Restoring replacement!");
        }
    });
    let PartnerIndex;
    Meteor.startup(function () {
        backupTask.start();
        getOwnIPAndPort();
        let partnerAddress = "http://IndexNode.meteor.com";
        PartnerIndex = DDP.connect(partnerAddress);
        let status = Async.runSync(function (done) {
            setTimeout(function () {
                done(null, PartnerIndex.status());
            }, SERVER_DELAY);
        });
        if (status.result.connected) {
            console.log("Connected to partner");
        } else {
            console.log("Not Connected to partner");
        }
    });
    Meteor.methods({
        findFile: function (fileName) {
            this.unblock;
            console.log("Finding the File Part Locations for: " + fileName.fileName);
            let file = Files.findOne({ "fileName": fileName.fileName });
            if (!(typeof file !== "undefined" && file !== null)) {
                throw new Meteor.Error(240, "Error 320: Could Not find file", "A file by this name has not been registered.");
            }
            console.log(JSON.stringify(file));
            let dictOfPeersUsedSoFar = {};
            let chunks = file.chunks.map(function (currentValue, index, array) {
                let bestPeerToUse;
                let bestPeerToUseIndex;
                let bestPeerToUseCount = Number.MAX_VALUE;
                for (let i = 0; i < currentValue.length; i++) {
                    let machineName = currentValue[i];
                    let machineCount = dictOfPeersUsedSoFar[machineName];
                    if (!(typeof machineCount !== "undefined" && machineCount !== null)) {
                        dictOfPeersUsedSoFar[machineName] = 1;
                        return currentValue[i];
                    } else {
                        if (machineCount < bestPeerToUseCount) {
                            bestPeerToUse = machineName;
                            bestPeerToUseCount = machineCount;
                            bestPeerToUseIndex = i;
                        }
                    }
                }
                dictOfPeersUsedSoFar[bestPeerToUse] += 1;
                return currentValue[bestPeerToUseIndex];
            });
            chunks = chunks.map(function (currentValue, index, array) {
                return {
                    "chunkNumber": index,
                    "chunk": currentValue
                };
            });
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
            let downHost = info.badMachine;
            Meteor.defer(function () {
                let cleanedChunks = file.chunks.map(function (currentValue, index, array) {
                    let clean = currentValue.filter(function (host) {
                        return host !== downHost;
                    });
                    return clean;
                });
                file.chunks = cleanedChunks;
                if (cleanedChunks.length !== 0) {
                    Files.update(file._id, file);
                } else {
                    Files.remove(file._id);
                }
            });
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
                    } else {
                        throw new Meteor.Error(240, "Error 240: Already registered", "A file by this name has not been registered.");
                        return;
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
                throw new Meteor.Error(240, "Error 240: Already registered", "A file by this name has not been registered.");
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
    function backupPartnerToSelf() {
        BackupForPartner.remove({});
        PartnerIndex.subscribe("allFiles");
        let AllFilesToBeBackedUp = new Mongo.Collection("toBackup", { connection: PartnerIndex });
        let cursor = AllFilesToBeBackedUp.find();
        cursor.forEach(function (doc) {
            BackupForPartner.insert(doc);
        });
    }
    function restoreSelfFromPartner() {
        PartnerIndex.subscribe("allBackupFiles");
        let AllBackedUpFiles = new Mongo.Collection("theBackup", { connection: PartnerIndex });
        let cursor = AllBackedUpFiles.find();
        cursor.forEach(function (doc) {
            Files.insert(doc);
        });
    }
}());

//# sourceMappingURL=PeerMeteor.map