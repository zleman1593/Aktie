//File System
var fs = Meteor.npmRequire('fs');
//All transfered Chunks
var chunks = [];
// //Array of peers client will try and transfer a file chunk from
// var peers = [];

var writeLocation = '/Users/zackleman/Desktop/ClientNode/public/'
var readLocation = '/Users/zackleman/Desktop/ClientNode2/public/'


Meteor.startup(function() {
    //Maybe alert an Index node that it is online?

});


Meteor.methods({

    registerFiletoShare: function(fileName) {
        registerFiletoShare(fileName);

    },

    download: function(file) {
        var fileName = file;
        //Connect to an Index Node
        var IndexNode = DDP.connect("http://localhost:5000");


        IndexNode.call('findFile', {
            "fileName": fileName
        }, function(error, result) {
            if (error) {

            } else {
                console.log(JSON.stringify(result));
                console.log("Obtained File Location Information");
                initPeerFileTransfer(result, fileName);
            }
        });

    },



    getFileChunks: function(requestedChunks) {
        var chunk = requestedChunks.chunk;
        var fileName = requestedChunks.fileName;
        var temp = getChunkOfFile(fileName, chunk);
        console.log(JSON.stringify(temp));
        return {
            "rawData": temp,
            "chunkNumber": chunk
        };
    }




});

var registerFiletoShare = function(fileName){
            var IndexNode = DDP.connect("http://localhost:5000");


        var hostNameWithPort = "http://localhost:3000";
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



var getWholeFile = function(fileName) {
    console.log("Returning Whole File");
    var base64Image = Async.runSync(function(done) {
        fs.readFile('/Users/zackleman/Desktop/ClientNode2/public/' + fileName, function(err, original_data) {
            var encodedData = original_data.toString('base64')
            done(null, encodedData);
            //console.log("First: " + encodedData);

        });
    });

    return base64Image;
}


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

var writeConcatedFile = function(base64String, fileName) {
    var decodedImage = new Buffer(base64String, 'base64');
    fs.writeFile(writeLocation + fileName, decodedImage, function(err) {});

resetForNextFileTransfer(fileName);

}

var resetForNextFileTransfer = function(fileName){
    chunks = [];
    registerFiletoShare(fileName);

}
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


var splitFileCount = function(filePath) {

    return 10;
}
