//File System
var fs = Meteor.npmRequire('fs');
//Temporary Arry of all transfered Chunks
var chunks = [];


var writeLocation = '/Users/zackleman/Desktop/ClientNode/public/'
var readLocation = '/Users/zackleman/Desktop/ClientNode2/public/'
var TESTING_INDEX_NODE = "http://localhost:5000";
var TESTING_OWN_IP =  "http://localhost:3000";

Meteor.startup(function() {
    //Maybe alert an Index node that it is online?
});


Meteor.methods({

    registerFiletoShare: function(fileName) {
        registerFiletoShare(fileName);
    },

    //Called when the peer node wants to get a file
    download: function(file) {
        var fileName = file;
        //Connect to an Index Node
        var indexNodeIP = findIndexNode();
        var IndexNode = DDP.connect(indexNodeIP);


        IndexNode.call('findFile', {
            "fileName": fileName
        }, function(error, result) {
            if (error) {

            } else {
                console.log("Obtained File Location Information");
                initPeerFileTransfer(result, fileName);
            }
        });

    },
    
    //Called when another peer wants part of a file from this client
    getFileChunks: function(requestedChunks) {
        var chunkNumber = requestedChunks.chunk;
        var fileName = requestedChunks.fileName;
        var data = getChunkOfFile(fileName, chunk);
        return {
            "rawData": data,
            "chunkNumber": chunkNumber
        };
    }
});

/*Will identify the most optimal IndexNode to conenct to.*/
var findIndexNode = function() {
    return TESTING_INDEX_NODE;
}

/*Will identify the most optimal IndexNode to conenct to.*/
var getOwnIPAndPort = function() {
    return TESTING_OWN_IP;
}

/*When a client node wants to indicate to the network that it is avalible to share a file*/
var registerFiletoShare = function(fileName) {
    var IndexNode = DDP.connect(findIndexNode());
    var hostNameWithPort = getOwnIPAndPort();
    var filepath = '/Users/zackleman/Desktop/ClientNode2/public/' + fileName;
    var numberOfParts = splitFileCount(filepath);

    IndexNode.call('registerFile', fileName, numberOfParts, hostNameWithPort, function(error, result) {
        if (error) {
            console.log("Registration Failed");
        } else {
            console.log("Registered File with Index Server");

        }
    });
}

/*Returns a specific chunk of the requested file*/
var getChunkOfFile = function(fileName, chunk) {
    console.log("Returning chunk File");
    var base64File = Async.runSync(function(done) {
        fs.readFile('/Users/zackleman/Desktop/ClientNode2/public/' + fileName, function(err, original_data) {
            var encodedData = original_data.toString('base64');
            var start;
            var amount;
            if (chunk == 0) {
                start = 0;
                amount = encodedData.length
            } else {
                start = encodedData.length;
                amount = encodedData.length / chunks.length
            }

            var chunkEncodedData = encodedData.substring(start, amount);
            done(null, chunkEncodedData);
        });
    });

    return {
        "base64File": base64File,
        "part": chunk
    };
}

/*Merges chunks of file once all chunks have been downloaded to local client node*/
var concatFile = function(chunkList) {
    //Make sure binary data string chunks are appeneded in the correct order
    chunkList.sort(function(a, b) {
        if (a.chunkNumber < b.chunkNumber) {
            return -1;
        } else {
            return 1;
        }

    });

    var data = chunkList[0].rawData.base64File.result;
    for (var i = 1; i < chunkList.length; i++) {
        data += chunkList[i].rawData.base64File.result;
    }
    return data;
}

/*Write the concatednated file to the local file system*/
var writeConcatedFile = function(base64String, fileName) {
    var decodedImage = new Buffer(base64String, 'base64');
    fs.writeFile(writeLocation + fileName, decodedImage, function(err) {});

    resetForNextFileTransfer(fileName);

}

var resetForNextFileTransfer = function(fileName) {
    //Reset chunks buffer
    chunks = [];
    //Now that the client node hat the whole file, it should share it with other peers
    registerFiletoShare(fileName);
}

/*Get all chunks from avalible peers*/
var initPeerFileTransfer = function(chunkHolder, fileName) {
    console.log("Start Calling Peers for file transfer");

    for (var chunk = 0; chunk < chunkHolder.chunks.length; chunk++) {

        peer = DDP.connect(chunkHolder.chunks[chunk].chunk);
        peer.call('getFileChunks', {
            "fileName": fileName,
            "chunk": chunk
        }, function(error, result) {
            if (error) {
                console.log("ERROR for peer: " + chunk);
            } else {
                console.log("Retrieved peer: " + chunk + " info");
                chunks.push(result);
                if (chunks.length == chunkHolder.chunks.length) {
                    var concatedFile = concatFile(chunks);
                    writeConcatedFile(concatedFile, fileName);
                }
            }
        });
    }

};

/*Temporary method: will need to calcuate hwo many parts a given fiel should be split into*/
var splitFileCount = function(filePath) {

    return 10;
}


// var getWholeFile = function(fileName) {
//     console.log("Returning Whole File");
//     var base64Image = Async.runSync(function(done) {
//         fs.readFile('/Users/zackleman/Desktop/ClientNode2/public/' + fileName, function(err, original_data) {
//             var encodedData = original_data.toString('base64')
//             done(null, encodedData);
//             //console.log("First: " + encodedData);

//         });
//     });

//     return base64Image;
// }

