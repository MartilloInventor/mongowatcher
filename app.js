#!/usr/bin/env node
// node.js version of savant

// t1 = new Date().getTime();
// t1 = Math.floor(t1/1000);
// var Ts = require('mongodb').Timestamp;
// t2 = new Ts(0, t1);
// t3 = t2.toInt();
// var testTimestamp = require('mongodb').Timestamp;
// var test_ts = new testTimestamp(437, 3478978);
// console.error(test_ts.toString());
// console.error(test_ts.toJSON());
// var test_date = new Date(1415141727*1000);
// var optionsdate = {
//     year: 'numeric', month: 'numeric', day: 'numeric'
// };

// var optionstime = {
//     hour: 'numeric', minute: 'numeric', second: 'numeric',
//     hour12: false
// };
// console.error(test_date.toLocaleDateString('en-US', optionsdate));
// console.error(test_date.toLocaleTimeString('en-US', optionstime));

// console.error("Year= %s, Month = %s, Date = %s, hours = %s, min =
// %s, sec = %s", test_date.getYear(), '0' + test_date.getMonth(), '0'
// + test_date.getDate(), test_date.getHours(),
// test_date.getMinutes(), test_date.getSeconds());

// var caseTwo = Date.parse("2014-10-29 03:33:30", "Y-m-d h:m:s");
// console.error(caseTwo);
// var caseFour = Date.parse("2014-10-29 00:00:00", "Y-m-d h:m:s");
// console.error(caseFour);
// console.error(caseTwo - caseFour);
// console.error(Date.parse(test_date.toLocaleTimeString('en-US', optionstime), "h:m:s"));

// var millisecs = caseTwo - caseFour;
// var seconds = millisecs/1000;
// var hours = seconds/(60*60);
// var remsec = seconds%(60*60);
// var minutes = remsec/60;
// var remsec = remsec%60;
// console.error('%d:%d:d', Math.floor(hours), Math.floor(minutes), Math.floor(remsec));
// var bucketno = console.error(Math.floor(seconds/300));

// INCLUDES
var path = require('path');
var fs = require('fs');
var yaml_config = require('node-yaml-config');
var nopt = require('nopt');
var noptDefaults = require('nopt-defaults');
var noptUsage = require('nopt-usage');
// Setup nconf to use (in-order):
//   1. Command-line arguments
//   2. Environment variables
//   3. A file located at 'path/to/config.json'
//
// nconf.argv()
//      .env()
//      .file({ file: 'path/to/config.json' });
//  only using nconf to get environment
var nconf = require('nconf');
var options = require('./getopt.js');

// FILE SCOPED VARIABLES
var yconfig0 = null;            // default files
var yconfig1 = null;            // environment nconf
var yconfig2 = null;            // commandline nopt
var yconfig3 = null;            // commandline getopt
var home = null;
var savantconf = null;
var savantgran = 0;
var savant = null;
var savantbrowser = null;
var savantoplog = null;
var savantdispatches = null;
var savantyaml = null;
// everything is optional.
// knownOpts and shorthands default to {}
// arg list defaults to process.argv
// slice defaults to 2 to get rid of node and prog.js name

// this shows how to define values for command line options
// knownOpts = { "foo" : [String, null]
//               , "baz" : path
//               , "bloo" : [ "big", "medium", "small" ]
//               , "flag" : Boolean
//               , "pick" : Boolean
//             };
var knownOpts = {
    granularity: Number,
    savantdbserver: String,
    listenerportforbrowser: Number,
    databaseoplog: String,
    databasedispatches: String,
    yamlfile: String,
    help: Boolean
};
var defaults = {
    granularity: 5,
    savantdbserver: 'local/test', // should it be in the local
    // database on the local machine.
    listenerportforbrowser: 3001,
    databaseoplog: 'local/local',     // has to be in local database.
    databasedispatches: 'local/test', // should it be in the local
    // database on the local machine.
    help: false
};
// seem like reasonable pre-defined granularities.
var shortHands = {
    "g30": ["--granularity", "30"],
    "g60": ["--granularity", "60"],
    "g1": ["--granularity", "1"],
    "g5": ["--granularity", "5"],
    "g10": ["--granularity", "10"],
    "g15": ["--granularity", "15"],
    "g25": ["--granularity", "25"],
    "h": ["--help", "true"]
};
var description = {
    "granularity": "savant bucket granularity",
    "savantdbserver": "uri, where to store savant data",
    "listenerportforbrowser": "port command browser should use",
    "databaseoplog": "uri, where to find optlog",
    "databasedispatches": "uri, where to find dispatches",
    "help": "prints usage"
};
var usage = noptUsage(knownOpts, shortHands, description, defaults); // a fairly static initialization
var parsed = null;
var noptyamlfile = null;
var getoptyamlfile = null;
var opt = null;                        // used for getopt
// set up defaults
var val = -1;                   // a sort of flag to detect error exit
var opLogDataBase = null;       // strings
var oplogdb = null;
var dispatchesDataBase = null;
var dispatchesdb = null;        // above is
// string; this
// data object
var dispatchescollection = null;       // probably need this global

var savantdatabase = null; // really database that
var savantdb = null;       // above is string
// this is data object
var savantcollection = null;    // probably need this global
var granularity = '5'; // minutes, getopt default
var granularitynumeric = 5;     // same as above but number
var quit = false;
var ready = false;
var grancount = 0;
var countdown = 0;
var countdownstart = 0;
var scale = 30000;                                   // ten sec
var browserlistener = null;
var start_ts = null;
var current_ts = null;
var previous_last_ts = null;
var milliseconds = 0;
// probably don't need these
var bucketStartTime = 0;
var bucketCount = 0;
var doccount = 0;

// FUNCTION DEFINITIONS

// changes the defaults
function setUpYamlDefaults(y0, y1, y2) {
    if (y0 != null) {
        if (y0.databaseoplog != undefined) {
            opLogDataBase = y0.databaseoplog; // really database that
        }
        if (y0.databasedispatches != undefined) {
            dispatchesDataBase = y0.databasedispatches; // really database
        }
        if (y0.savantdbserver != undefined) {
            savantdatabase = y0.savantdbserver; // really database that
        }
        if (y0.granularity != undefined) {
            granularitynumeric = y0.granularity;
        }
        if (y0.listenerportforbrowser != undefined) {
            browserlistener = y0.listenerportforbrowser; // need to learn
        }
    }
    if (y1 != null) {
        if (y1.databaseoplog != undefined) {
            opLogDataBase = y1.databaseoplog; // really database that
        }
        if (y1.databasedispatches != undefined) {
            dispatchesDataBase = y1.databasedispatches; // really database
        }
        if (y1.savantdbserver != undefined) {
            savantdatabase = y1.savantdbserver; // really database that
        }
        if (y1.granularity != undefined) {
            granularitynumeric = y1.granularity;
        }
        if (y1.listenerportforbrowser != undefined) {
            browserlistener = y1.listenerportforbrowser; // need to learn
        }
    }
    if (y2 != null) {
        if (y2.databaseoplog != undefined) {
            opLogDataBase = y2.databaseoplog; // really database that
        }
        if (y2.databasedispatches != undefined) {
            dispatchesDataBase = y2.databasedispatches; // really database
        }
        if (y2.savantdbserver != undefined) {
            savantdatabase = y2.savantdbserver; // really database that
        }
        if (y2.granularity != undefined) {
            granularitynumeric = y2.granularity;
        }
        if (y2.listenerportforbrowser != undefined) {
            browserlistener = y2.listenerportforbrowser; // need to learn
        }
    }
    if (opLogDataBase == undefined) {
        opLogDataBase = null;
    }
    if (dispatchesDataBase == undefined) {
        dispatchesDataBase = null;
    }
    if (savantdatabase == undefined) {
        savantdatabase = null;
    }
    if (granularitynumeric == undefined) {
        granularitynumeric = null;
    }
    if (browserlistener == undefined) {
        browserlistener = null;
    }
}


function getOplogBeforeTimeStamp(record, timestamp, callback) {
    if (record == null) {        // right from beginning
        OplogDoc.find({
            ts: {$lt: timestamp},
            ns:
                {
                    $in:
                        /[A-Za-z0-9]\.dispatches/
                }
        }).sort({ts: -1}).toArray(function
            (err, docs) {
            if (err)
                console.log
                (err);
            callback(docs);
        });
    } else { // a backward subset
        OplogDoc.find({
            ts: {
                $lt: timestamp,
                $gt: record.ts
            },
            ns:
                {
                    $in:
                        /[A-Za-z0-9]\.dispatches/
                }
        }).sort
        ({ts: -1}).toArray(function (err, docs) {
            if (err)
                console.log(err);
            callback(docs);
        });
    }
}

// need to determine how far backward to go.

//getTimestamp(); /* where to do this? */
function doOpLogInsert(collection, operation) {
    oplog.on(operation, function (doc) {
        console.log('event occured');
        console.log(doc);
        console.log('$inc delta is %d', delta);
        var ns = doc.ns;
        var idx = ns.indexOf('.'); // do I want to do this.
        //var coll = ns.substr(idx+1);
        //console.log('coll:'+coll);
        //var excluded = excludeCollections.indexOf(coll)>=0;
        var excluded = false;
        //console.log('exists:'+exists)
        //var objectId;
        //var objectCreatedDtm;
        //var objectMonitoredField;
        //var objectClientId;
        //var objectdeliveryProfileCode;
        //var objectStatusCode;
        //var objectStatusCreatedDtm;
        if (!excluded) {
            // here is were the bucket upserts are done
            //console.log(doc);
            //console.log(doc.o);
            // objectId = doc.o._id;
            // objectCreatedDtm = doc.o.createdDtm;
            // objectMonitoredField = doc.o.monitoredField;
            // objectClientId = doc.o.clientId;
            // objectdeliveryProfileCode = doc.o.deliveryProfileCode;
            // objectStatusCode = null;
            // objectStatusCreatedDtm = null;
            // if(!((doc.o.status == null) || (doc.o.status == undefined))) {
            //     objectStatusCode = doc.o.status.code;
            //     objectStatusCreatedDtm = doc.o.status.createdDtm;
            // }

        }
    });
}

function getHistIndex(doc) {
    if (doc.$set.statusHist != null)
        return 0;
    // if(doc.'$set'.'statusHist.1' != null)
    //     return 1;
    // if(doc.'$set'.'statusHist.2' != null)
    //     return 2;
    // if(doc.'$set'.'statusHist.3' != null)
    //     return 3;
    // if(doc.'$set'.'statusHist.4' != null)
    //     return 4;
    // if(doc.'$set'.'statusHist.5' != null)
    //     return 5;
    // if(doc.'$set'.'statusHist.6' != null)
    //     return 6;
    // if(doc.'$set'.'statusHist.7' != null)
    //     return 7;
    // if(doc.'$set'.'statusHist.8' != null)
    //     return 8;
    // if(doc.'$set'.'statusHist.9' != null)
    //     return 9;
    return -1;
}

function escapeKeys(obj) {
    if (!(Boolean(obj) && typeof obj == 'object'
            && Object.keys(obj).length > 0)) {
        return false;
    }
    Object.keys(obj).forEach(function (key) {
        if (typeof(obj[key]) == 'object') {
            escapeKeys(obj[key]);
        }
        if (key.indexOf('.') !== -1) {
            var newkey = key.replace(/\./g, '_dot_');
            obj[newkey] = obj[key];
            delete obj[key];
        }
    });
    return true;
}

function getHistIndex(keyarray) {
    var i = 0;

    for (i = 0; i < keyarray.length; ++i) {
        if (keyarray[i].match(/statusHistory/) != null) {
            return parseInt(keyarray[i].replace(/statusHistory_dot_/, ''));
        }
    }
    return -1;
}

function bucketize(doc) {
    //var opts = null;
    var docid = null;
    var channel = null;
    var status = null;
    var temp = null;
    var date = null;
    var datestring = '';
    var bucket = -1;
    var statushistindex = -1;
    var keylist = null;

    current_ts = doc.ts;
    date = new Date(current_ts.getHighBits() * 1000);
    datestring = date.toISOString().replace(/T.*/, '');
    bucket = Math.floor(((parseInt(date.getHours()) * 60 * 60) +
        (parseInt(date.getMinutes()) * 60) +
        (parseInt(date.getSeconds()))) / (granularitynumeric * 60));

    switch (doc.op) {
        case 'i':
            // docid is not needed in insert case
            channel = doc.o.deliveryChannel;
            status = doc.o.status.code;
            savantcollection.update({name: 'Tailing'},
                {$set: {end: current_ts}},
                {new: true, upsert: true, w: 1},
                function (err, result) {
                    if (err) {
                        console.error('unable to insert/update savant');
                        console.error(err);
                        process.exit(-1);
                    }
                });
            savantcollection.update({
                    name: 'Bucket', state: status, dispatch: channel,
                    granule: granularitynumeric,
                    date: datestring,
                    bucket: bucket
                },
                {$inc: {bucketcount: 1}},
                {new: true, upsert: true, w: 1},
                function (err, result) {
                    if (err) {
                        console.error('unable to insert/update savant bucket');
                        console.error(err);
                        process.exit(-1);
                    }
                });
            break;

        case 'u':
            if (doc.o._id != null) {
                // I am not sure how to handle this document -- it looks
                // like a duplicate.
                break;
            }

            docid = doc.o2._id;
            temp = doc.o.$set;
            escapeKeys(temp);
            status = temp.status_dot_code; // will this work?
            keylist = Object.keys(temp);
            statushistindex = getHistIndex(keylist);
            if (statushistindex == -1) {
                console.error('unable to parse oplog doc');
                console.error(doc);
                break;
            }
            savantcollection.update({name: 'Tailing'},
                {$set: {end: current_ts}},
                {new: true, upsert: true, w: 1},
                function (err, result) {
                    if (err) {
                        console.error('unable to update/update savant');
                        console.error(err);
                        process.exit(-1);
                    }
                });

            dispatchescollection.find({_id: docid}).toArray(function (err, doc2) {
                if (err) {
                    console.error('bucketize callback: ' + err);
                    process.exit(-1);
                }
                if (doc2.length == 0) {
                    console.error('unable to find docid');
                    console.error(docid);
                    return;
                }
                console.log("Read dispatch document, histindex %s", statushistindex);
                console.log(doc2);
                // let's do the previous state decrement
                if (statushistindex > 0) {
                    if (doc2[0].statusHistory == undefined) {
                        console.error('missing statusHistory');
                        console.error(doc2);
                        return;
                    }
                    channel = doc2[0].deliveryChannel;
                    status = doc2[0].statusHistory[statushistindex].code;
                    savantcollection.update({
                            name: 'Bucket', state: status, dispatch: channel,
                            granule: granularitynumeric,
                            date: datestring,
                            bucket: bucket
                        },
                        {$inc: {bucketcount: 1}},
                        {new: true, upsert: true, w: 1},
                        function (err, result) {
                            if (err) {
                                console.error('unable to update/update savant bucket');
                                console.error(err);
                                process.exit(-1);
                            }
                        });
                    status = doc2[0].statusHistory[statushistindex - 1].code;
                    savantcollection.update({
                            name: 'Bucket', state: status, dispatch: channel,
                            granule: granularitynumeric,
                            date: datestring,
                            bucket: bucket
                        },
                        {$inc: {bucketcount: -1}},
                        {new: true, upsert: true, w: 1},
                        function (err, result) {
                            if (err) {
                                console.error('unable to update/update savant bucket 2');
                                console.error(err);
                                process.exit(-1);
                            }
                        });
                }
            });
            break;

        default:
            break;                  // nothing to do
    }
}

function doCollectionSave(col, doc) {
    col.save(doc, function (err, stuff) {
        if (err) {
            console.error('doCollectionSave callback: ' + err);
            process.exit(-1);
        }
        // if it gets here the doc should have been saved.
        // since we only do this once let's check for sanity
        collection.findOne(doc, function (err, item) {
            assert.equal(null, err);
            assert.equal(doc, item);
            console.log('About to update Savant ' +
                'collection');
            console.log('added document');
            console.log(item);
            if (quit) {          // has savant exited via browser
                db.close();
                process.exit(0);
            }
        });
    });
}

function ConnectToOplogDatabase(databasename) {
    console.error('Entered ConnectToOplogDatabase');
    OpLogMongoClient.connect(databasename, function (err, db) {
        var coll = null;
        var cursor = null;
        var stream = null;

        if (err) {
            console.error('OpLogMongoClient.connect callback: ' + err);
            process.exit(-1);       // should savant continue
            // when connection to
            // mongo db lost?
        }
        oplogdb = db;
        oplogcollection = coll = db.collection('oplog.rs');
        // start tailing
        if (previous_last_ts == null) {
            // go to end of oplog -- initial savant condition
            coll.find({}, {ts: 1}).sort({$natural: -1}).limit(1).toArray(function (err, data) {
                var lastOplogTime = null;
                var queryForTime = null;

                if (data.length == 0) { // nothing in oplog
                    current_ts = new MongoDB.Timestamp(0, Math.floor(new Date().getTime() / 1000));
                    lastOplogTime = current_ts;
                    savantcollection.findAndModify({name: 'Tailing'}, [['start', 1]],
                        {$set: {end: current_ts}},
                        {new: true, upsert: true, w: 0});
                } else {        // something in oplog
                    lastOplogTime = data[0].ts;
                    // If there isn't one found, get one from the local clock
                    if (lastOplogTime == null) { // can this case occur?
                        current_ts = new MongoDB.Timestamp(0, Math.floor(new Date().getTime() / 1000));
                        lastOplogTime = current_ts;
                        savantcollection.findAndModify({name: 'Tailing'}, [['start', 1]],
                            {$set: {end: current_ts}},
                            {new: true, upsert: true, w: 0});
                    }
                }
                queryForTime = {$gt: lastOplogTime};
                // Create a cursor for tailing and set it to await data
            });
        } else {
            queryForTime = {$gt: previous_last_ts};
        }
        cursor = coll.find({
                ts: queryForTime,
                ns: /[A-Za-z0-9]*\.dispatches/
            },
            {
                tailable: true,
                awaitdata: true,
                oplogReplay: true,
                numberOfRetries: -1
            });
        // Wrap that cursor in a Node Stream
        stream = cursor.stream();
        // And when data arrives at that stream, print it out
        stream.on('data', function (oplogdoc) {
            console.log(oplogdoc);
            bucketize(oplogdoc);
        });
    });
}


function ConnectToDispatchesDatabase(databasename) {
    DispatchesMongoClient.connect(databasename, function (err, db) {
        //var collection = null;
        if (err) {
            console.error('DispatchesMongoClient.connect callback: ');
            console.error(err);
            process.exit(-1);       // should savant continue when connection to savant db lost?
        }
        dispatchesdb = db;      // maybe unnecessary
        dispatchescollection = db.collection('dispatches'); // will only search after tailing oplog
        ConnectToOplogDatabase(opLogDataBase);
    });
}

function setUpSavantDatabase(collection, namestr) {
    collection.find(namestr).sort({end: -1}).toArray(function (err, data) {
        // trying to find news Last Access Time record in Savant collection
        var record = null;      // record is either valid or null
        var len = 0;
        // var index = 0;
        if (err) {
            console.error('collection.find callback: ' + err);
            process.exit(-1);       // should savant continue when connection to savant db lost
        }
        if ((data != undefined) && (data != null)) { // I think null is correct test
            len = data.length;
            switch (len) {
                case 0:
                    collection.insert({name: namestr.name, start: start_ts, end: current_ts},
                        {w: 1}, function (err, result) {
                            if (err) {
                                console.error('Unable to insert: ' + err);
                                process.exit(-1);
                            }
                            console.log('Successfully logged initial savant record: ');
                            console.log(record);
                            ConnectToDispatchesDatabase(dispatchesDataBase);
                        });
                    break;
                case 1:
                    record = data[0];
                    previous_last_ts = record.end; // find out last stop ts
                    // probably don't need to do the following
                    // collection.update(record,
                    //                   {$set: {start: start_ts, end:current_ts}},
                    //                   {new:true, upsert:true, w: 1}, function(err, result) {
                    //                       if(err) {
                    //                           console.error('Unable to upsert: ' + err);
                    //                           process.exit(-1);
                    //                       }
                    //                       console.log('Successfully updated initial savant record: ');
                    //                       console.log(record);
                    //                       ConnectToDispatchesDatabase(dispatchesDataBase);
                    //                   });
                    console.log('using database record:');
                    console.log(record);
                    ConnectToDispatchesDatabase(dispatchesDataBase);
                    break;
                default:
                    record = data[0];
                    previous_last_ts = record.end; // find out last stop ts
                    console.log('Most recent Last Access Time record is %s.', record.toString());
                    // get rid of the rest of the records.
                    collection.remove({end: {$lt: record.end}}, {w: 1}, function (err, result) {
                        if (err != null) {
                            console.err('remove callback: ' + err);
                            process.exit(-1);
                        }
                        // collection.update(record, [['start', 1]],
                        //                   {start: start_ts, end:current_ts},
                        //                   {new:true, upsert:true});
                        console.log('Successfully removed unnecessary savant records, using: ');
                        console.log(record);
                        ConnectToDispatchesDatabase(dispatchesDataBase);
                    }); // should we worry about remove failures
                    break;
            }

            // Can we connect to dispatches database
            // DispatchesMongoClient.connect(dispatchesDatabase, function(err, db) {
            //     var collection = null;

            //     if(err) {
            //         console.error('DispatchesMongoClient.connect callback: ' + err);
            //         process.exit(-1);       // should savant continue
            //         // when connection to
            //         // dispatches db lost?
            //     }
            //     dispatchesdb = db;
            //     collection = db.collection('dispatches');
            //     OpLogMongoClient.connect(opLogDatabase, function(err, oplogdb) {
            //         var oplogcollection = null;
            //         if(err) {
            //             console.error('OpLogMongoClient.connect callback: ' + err);
            //             process.exit(-1);       // should savant continue
            //             // when connection to
            //             // mongo db lost?
            //         }
            //         oplogcollection = oplogdb.collection('oplog.rs');
            //     });

            //     // need to set up tailing and the granularity time now.

            //     milliseconds = (new Date).getTime();
            //     current_ts = new Timestamp(0, Math.floor(milliseconds/1000));
            //     console.error('tailing really did start');
            //     // no reason to do this before all three data bases connected
            //     // here's the first timestamp save -- also done in doOpLog and granularity timer
            //     doCollectionSave(collection, {name: 'tailing',
            //                                   start: current_ts, end: current_ts});
            //     ready = true;                   // starting the analysis
            //     oplog.tail(function(err, doc) { // need to filter here
            //         if(err) {
            //             console.error('Something bad happened');
            //             process.exit(-1);
            //         }
            //         doOpLogInsert(collection); // I assume collection is within scope of closure.
            //         doOpLogUpdate(collection);
            //         oplog.on('error', function (error) {
            //             console.log('error: ', error); // need to time stamp
            //             process.exit(-1);
            //         });

            //         oplog.on('end', function () {
            //             console.log('end: ', 'Stream ended'); // need to time stamp
            //             process.exit(-1);
            //         });
            //     });

            // });
        } else {
            console.error('Savant startup memory corruptions');
            process.exit(-1);
        }
    });
}

// SCRIPT

// go through yaml default file if it exists
try {
    console.log('Attempting to read yaml defaults from .savant');
    yconfig0 = yaml_config.load(__dirname + path.sep + '.savant');
} catch (err) {
    yconfig0 = null;
    console.error('Could not find %s: %s', __dirname + path.sep + '.savant', err);
    console.error('Trying %s', __dirname + path.sep + 'savant.yml');
    try {
        yconfig0 = yaml_config.load(__dirname + path.sep + 'savant.yml');
    } catch (err) {
        console.error('Could not find %s: %s', __dirname + path.sep + 'savant.yml', err);
        console.error('All configuration will come from environment or command line.');
    }
}

if (yconfig0 != null) {
    console.log('Here is the configuration from .savant or savant.yml in current working directory %s.', __dirname);
    console.log(yconfig0);
}

parsed = noptDefaults(nopt(knownOpts, shortHands, process.argv, 0), defaults); // why do this here?
// To look for command line yaml config file which should be processed before env, nopt command line, and getopt
// command line.

// It might be cleverer to put the yaml default read in defaults, but I did not want to deal with try/catch issue;

savantyaml = parsed.yamlfile;
if (savantyaml == undefined)
    savantyaml = null;

if (savantyaml != null) {
    try {
        console.log('Attempting to read yaml defaults from %s', savantyaml);
        yconfig1 = yaml_config.load(savantyaml);
    } catch (err) {
        yconfig1 = null;
        console.error('Could not find %s: %s', savantyaml);
        console.error('All configuration will come from environment or command line.');
    }
}

nconf.env();
savantyaml = nconf.get('SAVANTYAML'); // yaml file is special
if (savantyaml == undefined)
    savantyaml = null;

if (savantyaml != null) {
    try {
        console.log('Attempting to read yaml defaults from %s', savantyaml);
        yconfig2 = yaml_config.load(savantyaml);
    } catch (err) {
        yconfig2 = null;
        console.error('Could not find %s: %s', savantyaml);
        console.error('All configuration will come from environment or command line.');
    }
}

if (yconfig2 != null) {
    console.log('Here is the configuration from SAVANTYAML env variable %s.', __dirname);
    console.log(yconfig1);
}

// setup yaml defaults which could be spread over 3 files
// they could be overridden from environment and command line

setUpYamlDefaults(yconfig0, yconfig1, yconfig2);

// environment can override defaults either from yaml file or from builtin config
savantbrowser = nconf.get('SAVANTBROWSER');
savantoplog = nconf.get('SAVANTOPLOG');
savantdispatches = nconf.get('SAVANTDISPATCHES');
savantgran = nconf.get('SAVANTGRAN');
savant = nconf.get('SAVANT');

// get rid of the irritating undefined
if (savantbrowser == undefined) {
    savantbrowser = null;
}
if (savantoplog == undefined) {
    savantoplog = null;
}
if (savantdispatches == undefined) {
    savantdispatches = null;
}
if (savantgran == undefined) {
    savantgran = null;
}
if (savant == undefined) {
    savant = null;
}

// change defaults again
if (savantbrowser != null) {
    browserlistener = savantbrowser;
}
if (savantoplog != null) {
    opLogDataBase = savantoplog;
}
if (savantdispatches != null) {
    dispatchesDatabase = savantdispatches;
}
if (savantgran != null) {
    granularity = savantgran;
    granularitynumeric = parseInt(granularity);
}
if (savant != null) {
    savantdatabase = savant;
}

if (parsed.help == true) {
    console.log('Usage (nopt args): ');
    console.log(usage);
    process.exit(0);
}
// I think -- takes care of getting to getopt args.

console.log('Parsed args = ');
console.log(parsed);
console.log('argv = ');
console.log(parsed.argv.remain);

// alternative get command line options for savant

opLogDataBase = parsed.databaseoplog; // really database that
// contains oplog.rs
// collection

dispatchesDataBase = parsed.databasedispatches; // really database
// that contains
// dispatches
// collection

savantdatabase = parsed.savantdbserver; // really database that
// contains savant
// collection
granularitynumeric = parsed.granularity;
browserlistener = parsed.listenerportforbrowser; // need to learn

console.log('Starting Savant\nCalled with the following arguments:');
console.log(process.argv);
console.log('Arglist length is : %d.', process.argv.length);

// now skip to getopt args which can override previous args.
// whichever styles makes user happy
options.skiptoopts(parsed.argv.cooked);

// getopt can override nopt arguments and defaults.  minor bug in
// going over command line option list -- needs to be fixed.  in
// getopt.js

// I keep this because it is the first node.js routint I wrote and
// some users might be more comfortable with getopt style option
// processing.

while ((opt = options.getopt(parsed.argv.cooked, 'd:g:o:l:s:?')) != '') {
    switch (opt) {
        case 'o':
            console.log('o option found. opLogDataBase list is: %s', opLogDataBase = options.getoptarg());
            break;
        case 's':
            console.log('s option found. save data to: %s', savantdatabase = options.getoptarg());
            break;
        case 'l':
            console.log('l option found. Listener is: %d', browserlistener = parseInt(options.getoptarg()));
            break;
        case ':':
            console.log('Error - Option needs a value: %s', options.getoptopt());
            process.exit(-1);
        case 'g':
            console.log('g option found. granularity in minutes is: %s', granularity = options.getoptarg());
            granularitynumeric = parseInt(granularity);
            break;
        case 'd':
            console.log('d option found. dispatchesDatabaseList is %s',
                dispatchesDataBase = options.getoptarg());
            break;

        case '?':                   // ok
            val = 0;
        default:                    // bad
            if (val == -1) {
                console.log('Unknown option');
            }
            console.log
            ('Format: node test.js {nopt-args} -- -d {comma separated opLogDataBase list } ' +
                '-l {PORTNO} -g {granularity in min}');
            process.exit(val);
    }
}

// all defaults should be correct -- but no harm to check.

if (Number.isNaN(granularitynumeric)) {
    console.log('Bad granularity.');
    process.exit(-1);
}

// let's turn the granularity into a countdown

countdownstart = (granularitynumeric * 60 * 1000) / scale;
countdown = countdownstart;

if (opLogDataBase === '') {
    console.log('No opLogDataBase list.');
    process.exit(-1);
}

if (dispatchesDataBase === '') {
    console.log('No dispatchesDataBase list.');
    process.exit(-1);
}

if (savantdatabase === '') {
    console.log('No save database list.');
    process.exit(-1);
}

if (Number.isNaN(browserlistener)) {
    console.log('No listener.');
    process.exit(-1);
}

if (browserlistener == 0) {
    console.log('Bad listener.');
    process.exit(-1);
}

listener = browserlistener;     // something wrong here!
// From where did this global come?
// is this part of Express -- I would prefer a setter.
// some startup setup on basis of args
// let user know current configuration
console.log('url:' + opLogDataBase);
console.log('savant url:' + savantdatabase);
console.log('dispatches url:' + dispatchesDataBase);
opLogDataBase = 'mongodb://' + opLogDataBase;
console.log('oplog connection name is %s', opLogDataBase);
dispatchesDataBase = 'mongodb://' + dispatchesDataBase;
console.log('dispatches connection name is %s', dispatchesDataBase);
savantdatabase = 'mongodb://' + savantdatabase;
console.log('savant connection name is %s', savantdatabase);
// everything above is now in proper URI format. Hooray!!!

// set up the express routing.
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes/index');
var users = require('./routes/users');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// Here is where savant really starts

var MongoOplog = require('mongo-oplog');
// Declaration block
var Timestamp = require('mongodb').Timestamp;

var SavantMongoClient = require('mongodb').MongoClient;
var DbSavant = require('mongodb').Db;
var DispatchesMongoClient = require('mongodb').MongoClient;
var OpLogMongoClient = require('mongodb').MongoClient;
var oplog = MongoOplog(opLogDataBase); // too bad no call back in case

// of failure
// probably don't need the rest???
// ServerSavant = require('mongodb').Server,
ObjectIDSavant = require('mongodb').ObjectID,
    BinarySavant = require('mongodb').Binary,
    GridStoreSavant = require('mongodb').GridStore,
    GridSavant = require('mongodb').Grid,
    CodeSavant = require('mongodb').Code,
    BSONSavant = require('mongodb').pure().BSON,
    assert = require('assert');
// end Declaration block

read = true;

console.log('starting granularity timer');

// start the interval counter

milliseconds = (new Date).getTime();
current_ts = start_ts = new Timestamp(0, Math.floor(milliseconds / 1000));

//probably SavantMongoClient.connect should be a call back from getTimestamp()

SavantMongoClient.connect(savantdatabase, function (err, db) {
    var collection = null;
    if (err) {
        console.error('SavantMongoClient.connect callback: ' + err);
        process.exit(-1);       // should savant continue when connection to savant db lost?
    }
    savantdb = db;
    savantcollection = collection = db.collection('SavantDataCollection');
    setUpSavantDatabase(collection, {name: 'Tailing'});
});

// setInterval(function(){
//     console.log('Still alive');
//     if(quit) {
//         console.log('Shutting down savant by user command.');
//         process.exit(0);
//     }
//     if(ready == true) {
//         if(--countdown <= 0)
//             ++grancount;
//         doCollectionSave(collection, {name: 'Savant Access Time',
//                                       starttime: start_ts, currenttime: start_ts,
//                                       ts: ts});
//         countdown = countdownstart
//     }}, 30 * 1000);             // 30 sec for time expiration

// MongoClient.connect(oplogMongoString, function(err, db) {
//     if(err) {
//         console.error(err);
//      return;
//     }
//     //console.log('successfully connected to mongoserver\nusing database:');
//     console.log('successfully connected to mongoserver');
//     // console.log(db);
//     // getting the oplog.rs collection
//     console.log('Getting the oplog.rs collection');
//     //console.log(db.collection('oplog.rs').find().limit(1));
//     // Get to oplog collection
//     db.collection('oplog.rs',function(err,oplog) {
//         // Find the highest timestamp
//         oplog.find({},{ts: 1}).sort({$natural: -1}).toArray(function(err,data) {
//             lastOplogTime=data[0].ts;
//             // If there isn't one found, get one from the local clock
//             if(lastOplogTime) {
//                 queryForTime= { $gt: lastOplogTime };
//             } else {
//                 tstamp=new MongoDB.Timestamp(0,Math.floor(new Date().getTime()/1000))
//                 queryForTime= { $gt: tstamp };
//             }
//             // Create a cursor for tailing and set it to await data
//             cursor=oplog.find({ts: queryForTime}, { tailable:true,
//                                                     awaitdata:true,
//                                                     oplogReplay:true,
//                                                     numberOfRetries:-1 });
//             // Wrap that cursor in a Node Stream
//             stream = cursor.stream();

//             // we analyze a message onlly if it comes from the following list
//          // of collections
//             var cachedCollections = ['dispatches'];//should this be fully qualified
//             // read the cursors content via a Node Stream

//             // And when data arrives at that stream, print it out
//             stream.on('data', function(oplogdoc) {
//                 console.log('about to read the cursors content');
//                 console.log(oplogdoc); // this is here so that
//              // the growth of oplog can be analyzed
//              // during debugging
//                 var ns = oplogdoc.ns;
//                 var idx = ns.indexOf('.');
//                 var coll = ns.substr(idx+1);
//                 //console.log('coll:'+coll);
//                 var contains = cachedCollections.indexOf(coll)>=0;
//                 //console.log('exists:'+exists)
//                 var objectId;
//                 var objectCreatedDtm;
//                 var objectMonitoredField;
//                 var objectClientId;
//                 var objectdeliveryProfileCode;
//                 var objectStatusCode;
//                 var objectStatusCreatedDtm;
//                 if(contains) {
//                     console.log(oplogdoc);
//                     console.log(oplogdoc.o);
//                     objectId = oplogdoc.o._id;
//                     objectCreatedDtm = oplogdoc.o.createdDtm;
//                     objectMonitoredField = oplogdoc.o.monitoredField;
//                     objectClientId = oplogdoc.o.clientId;
//                     objectdeliveryProfileCode = oplogdoc.o.deliveryProfileCode;
//                     objectStatusCode = null;
//                     objectStatusCreatedDtm = null;
//                     if(!((oplogdoc.o.status == null) || (oplogdoc.o.status == undefined))) {
//                         objectStatusCode = oplogdoc.o.status.code;
//                         objectStatusCreatedDtm = oplogdoc.o.status.createdDtm;
//                     }
//                 }
//             });
//             console.log('doing some clean up');
//             stream.on('error',function(error){
//                 console.log('Error...');
//             });
//             stream.on('close',function(){
//                 console.log('Closed...');
//             });
//         });
//     });
// });


//mongoose.connection.on('error', console.error.bind(console, 'MongoDB oplog connection error:'));
// Database connect options
//var options = { replset: { socketOptions: { connectTimeoutMS : 30000 }}}; // should be
// configured from noopt or getopt.js
//var oplogConn = mongoose.createConnection(oplogMongoString, options);
// connect to the oplog replicaset
//var OplogDoc = oplogConn.model('OplogDoc', {ns: String, ts: Object},
//'oplog.rs');
//var encoding = 'utf8';
//var pub;
//var latestEntryId = 'LATEST_ENTRY';

/* Here are the databases in realdoc_prod:
   batchApproval
   batchTracking
   bookmarkTypes
   clients
   correspondenceBatch
   correspondenceRequests
   dataCatalogs
   deliveryConfig
   deliveryGroup
   deliveryProfiles
   dispatchStatCounter
   dispatches
   documentApproval
   documentAudit
   documentCategories
   documentTitles
   documentTypes
   documents
   fileSets
   fileSystemFiles
   fileSystemRoots
   flags
   folders
   formatters
   fs.chunks
   fs.files
   groupAttributes
   headers
   importConfigs
   incrementedNames
   links
   messageHistory
   permissionTypes
   printRecon.correspondenceTransactionLog
   printRecon.fileTransactionLog
   printRecon.fileTransactionStatus
   properties
   queries
   queuedPages
   real_menu_node
   real_menu_parent
   remoteFiles
   requestGroup
   resource
   resourceType
   rs.positionMapping
   rsLetterMapping
   rsLetterMappingTp2
   rsLocationConfigMapping
   rules
   scripts.docGenerator
   scripts.history
   searchConfigs
   system.indexes
   system.js
   system.profile
   templates
   userattributes
   validators
   viewerDocumentData
   workspaces
*/

console.log('finished app.js');
module.exports = app;
